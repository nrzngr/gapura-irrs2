import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface StationRow {
    station: string;
    total: number | string;
    resolved: number | string;
    pending: number | string;
    in_progress: number | string;
    high: number | string;
    medium: number | string;
    low: number | string;
}

interface DivisionRow {
    division: string;
    total: number | string;
    resolved: number | string;
    pending: number | string;
    high: number | string;
}

interface SummaryRow {
    total_reports: number | string;
    resolved: number | string;
    pending: number | string;
    verified: number | string;
    high_severity: number | string;
    trend_data: unknown[];
    severity_data: unknown[];
    status_data: unknown[];
    incident_data: unknown[];
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        let dateFrom: string | null = null;
        let dateTo: string | null = null;

        if (from && to) {
            dateFrom = new Date(from).toISOString();
            dateTo = new Date(to).toISOString();
        } else if (period) {
            const now = new Date();
            dateTo = now.toISOString();
            switch (period) {
                case '7d': dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); break;
                case '30d': dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(); break;
                case '3m': dateFrom = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString(); break;
                case '6m': dateFrom = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString(); break;
            }
        }

        // Build WHERE clause
        const conditions: string[] = [];
        const params: string[] = [];
        if (dateFrom) {
            params.push(dateFrom);
            conditions.push(`r.created_at >= $${params.length}`);
        }
        if (dateTo) {
            params.push(dateTo);
            conditions.push(`r.created_at <= $${params.length}`);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Generate monthly trend params for last 6 months
        const now = new Date();
        const monthKeys: { key: string; label: string; start: string; end: string }[] = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
            monthKeys.push({ key, label, start: date.toISOString(), end: endDate.toISOString() });
        }

        // Run all aggregation queries in SQL via parallel Promise.all
        const [stationResult, divisionResult, summaryResult, stationsList] = await Promise.all([
            // Station stats (aggregated in SQL instead of fetching all rows)
            supabaseAdmin.rpc('run_analytics_query', {
                query_text: `
                    SELECT
                        COALESCE(s.code, 'Unknown') AS station,
                        count(*) AS total,
                        count(*) FILTER (WHERE r.status = 'SELESAI') AS resolved,
                        count(*) FILTER (WHERE r.status = 'MENUNGGU_FEEDBACK') AS pending,
                        count(*) FILTER (WHERE r.status = 'SUDAH_DIVERIFIKASI') AS in_progress,
                        count(*) FILTER (WHERE r.severity = 'high') AS high,
                        count(*) FILTER (WHERE r.severity = 'medium') AS medium,
                        count(*) FILTER (WHERE r.severity = 'low') AS low
                    FROM reports r
                    LEFT JOIN stations s ON r.station_id = s.id
                    ${whereClause}
                    GROUP BY COALESCE(s.code, 'Unknown')
                    ORDER BY count(*) DESC
                `,
                query_params: params,
            }),

            // Division stats
            supabaseAdmin.rpc('run_analytics_query', {
                query_text: `
                    SELECT
                        CASE
                            WHEN u.division IN ('OS', 'OP', 'OT', 'UQ') THEN u.division
                            ELSE 'Lainnya'
                        END AS division,
                        count(*) AS total,
                        count(*) FILTER (WHERE r.status = 'SELESAI') AS resolved,
                        count(*) FILTER (WHERE r.status IN ('MENUNGGU_FEEDBACK', 'SUDAH_DIVERIFIKASI')) AS pending,
                        count(*) FILTER (WHERE r.severity = 'high') AS high
                    FROM reports r
                    LEFT JOIN users u ON r.user_id = u.id
                    ${whereClause}
                    GROUP BY CASE WHEN u.division IN ('OS', 'OP', 'OT', 'UQ') THEN u.division ELSE 'Lainnya' END
                    ORDER BY count(*) DESC
                `,
                query_params: params,
            }),

            // Summary + severity + status + incident types + monthly trend (single query with CTEs)
            supabaseAdmin.rpc('run_analytics_query', {
                query_text: `
                    WITH base AS (
                        SELECT r.id, r.status, r.severity, r.created_at, it.name AS incident_type_name
                        FROM reports r
                        LEFT JOIN incident_types it ON r.incident_type_id = it.id
                        ${whereClause}
                    ),
                    summary AS (
                        SELECT
                            count(*) AS total_reports,
                            count(*) FILTER (WHERE status = 'SELESAI') AS resolved,
                            count(*) FILTER (WHERE status = 'MENUNGGU_FEEDBACK') AS pending,
                            count(*) FILTER (WHERE status = 'SUDAH_DIVERIFIKASI') AS verified,
                            count(*) FILTER (WHERE severity = 'high') AS high_severity
                        FROM base
                    ),
                    severity_dist AS (
                        SELECT json_agg(json_build_object('name', name, 'value', val, 'color', color) ORDER BY val DESC) AS data
                        FROM (
                            SELECT 'High' AS name, count(*) FILTER (WHERE severity = 'high') AS val, '#ef4444' AS color FROM base
                            UNION ALL
                            SELECT 'Medium', count(*) FILTER (WHERE severity = 'medium'), '#f59e0b' FROM base
                            UNION ALL
                            SELECT 'Low', count(*) FILTER (WHERE severity = 'low'), '#10b981' FROM base
                        ) t
                    ),
                    status_dist AS (
                        SELECT json_agg(json_build_object('name', name, 'value', val, 'color', color)) AS data
                        FROM (
                            SELECT 'Menunggu Feedback' AS name, count(*) FILTER (WHERE status = 'MENUNGGU_FEEDBACK') AS val, '#f59e0b' AS color FROM base
                            UNION ALL
                            SELECT 'Sudah Diverifikasi', count(*) FILTER (WHERE status = 'SUDAH_DIVERIFIKASI'), '#3b82f6' FROM base
                            UNION ALL
                            SELECT 'Selesai', count(*) FILTER (WHERE status = 'SELESAI'), '#10b981' FROM base
                        ) t
                    ),
                    incident_dist AS (
                        SELECT json_agg(json_build_object('name', name, 'value', val) ORDER BY val DESC) AS data
                        FROM (
                            SELECT COALESCE(incident_type_name, 'Lainnya') AS name, count(*) AS val
                            FROM base
                            GROUP BY name
                            ORDER BY val DESC
                            LIMIT 8
                        ) t
                    ),
                    monthly AS (
                        SELECT json_agg(json_build_object(
                            'month', month_label,
                            'total', total,
                            'resolved', resolved,
                            'high', high
                        ) ORDER BY month_key) AS data
                        FROM (
                            SELECT
                                date_trunc('month', created_at) AS month_key,
                                to_char(date_trunc('month', created_at), 'Mon YY') AS month_label,
                                count(*) AS total,
                                count(*) FILTER (WHERE status = 'SELESAI') AS resolved,
                                count(*) FILTER (WHERE severity = 'high') AS high
                            FROM base
                            GROUP BY date_trunc('month', created_at)
                            ORDER BY month_key
                        ) t
                    )
                    SELECT
                        s.total_reports, s.resolved, s.pending, s.verified, s.high_severity,
                        COALESCE(sev.data, '[]'::json) AS severity_data,
                        COALESCE(st.data, '[]'::json) AS status_data,
                        COALESCE(inc.data, '[]'::json) AS incident_data,
                        COALESCE(m.data, '[]'::json) AS trend_data
                    FROM summary s
                    LEFT JOIN severity_dist sev ON true
                    LEFT JOIN status_dist st ON true
                    LEFT JOIN incident_dist inc ON true
                    LEFT JOIN monthly m ON true
                `,
                query_params: params,
            }),

            // Stations list (lightweight, cached separately)
            supabase.from('stations').select('code, name').order('code'),
        ]);

        // Parse station data
        const stationData = ((stationResult.data as StationRow[]) || []).map((row) => ({
            station: row.station,
            total: Number(row.total),
            resolved: Number(row.resolved),
            pending: Number(row.pending),
            inProgress: Number(row.in_progress),
            high: Number(row.high),
            medium: Number(row.medium),
            low: Number(row.low),
            resolutionRate: Number(row.total) > 0 ? Math.round((Number(row.resolved) / Number(row.total)) * 100) : 0,
        }));

        // Parse division data
        const divisionData = ((divisionResult.data as DivisionRow[]) || []).map((row) => ({
            division: row.division,
            total: Number(row.total),
            resolved: Number(row.resolved),
            pending: Number(row.pending),
            high: Number(row.high),
            resolutionRate: Number(row.total) > 0 ? Math.round((Number(row.resolved) / Number(row.total)) * 100) : 0,
        }));

        // Parse summary data
        const summaryRow = (summaryResult.data as SummaryRow[])?.[0] || {} as SummaryRow;
        const totalReports = Number(summaryRow.total_reports) || 0;
        const resolvedReports = Number(summaryRow.resolved) || 0;

        return NextResponse.json({
            stationData,
            divisionData,
            trendData: Array.isArray(summaryRow.trend_data) ? summaryRow.trend_data : [],
            severityData: Array.isArray(summaryRow.severity_data) ? summaryRow.severity_data : [],
            statusData: Array.isArray(summaryRow.status_data) ? summaryRow.status_data : [],
            incidentData: Array.isArray(summaryRow.incident_data) ? summaryRow.incident_data : [],
            stations: stationsList.data || [],
            summary: {
                totalReports,
                resolvedReports,
                pendingReports: Number(summaryRow.pending) || 0,
                verifiedReports: Number(summaryRow.verified) || 0,
                highSeverity: Number(summaryRow.high_severity) || 0,
                avgResolutionRate: totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0,
                stationCount: stationData.length,
            }
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
                'CDN-Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
            },
        });
    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
