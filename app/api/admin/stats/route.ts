import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        // Build date filter
        let dateFrom: string | null = null;
        let dateTo: string | null = null;

        if (from && to) {
            dateFrom = new Date(from).toISOString();
            dateTo = new Date(to).toISOString();
        } else if (period) {
            const now = new Date();
            dateTo = now.toISOString();
            switch (period) {
                case '7d':
                    dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
                    break;
                case '30d':
                    dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
                    break;
                case '3m':
                    dateFrom = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString();
                    break;
                case '6m':
                    dateFrom = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString();
                    break;
            }
        }

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // Build date condition for parameterized query
        const dateCondition = dateFrom && dateTo
            ? `created_at >= $1 AND created_at <= $2`
            : dateFrom
                ? `created_at >= $1`
                : 'TRUE';

        const params: string[] = [];
        if (dateFrom) params.push(dateFrom);
        if (dateTo) params.push(dateTo);

        const paramOffset = params.length;

        // Consolidated CTE query: replaces 13 separate count queries with 1
        const sql = `
            WITH filtered AS (
                SELECT status, severity, sla_deadline, station_id, location
                FROM reports
                WHERE ${dateCondition}
            ),
            counts AS (
                SELECT
                    count(*) AS total,
                    count(*) FILTER (WHERE status = 'MENUNGGU_FEEDBACK') AS menunggu_feedback,
                    count(*) FILTER (WHERE status = 'SUDAH_DIVERIFIKASI') AS sudah_diverifikasi,
                    count(*) FILTER (WHERE status = 'SELESAI') AS selesai,
                    count(*) FILTER (WHERE severity = 'high') AS high_severity,
                    count(*) FILTER (WHERE severity = 'medium') AS medium_severity,
                    count(*) FILTER (WHERE severity = 'low') AS low_severity,
                    count(*) FILTER (WHERE sla_deadline < $${paramOffset + 1} AND status != 'SELESAI') AS sla_breach
                FROM filtered
            ),
            trends AS (
                SELECT
                    count(*) FILTER (WHERE created_at >= $${paramOffset + 2}) AS today,
                    count(*) FILTER (WHERE created_at >= $${paramOffset + 3}) AS this_week,
                    count(*) FILTER (WHERE created_at >= $${paramOffset + 4}) AS this_month
                FROM reports
            ),
            user_counts AS (
                SELECT
                    count(*) FILTER (WHERE status = 'pending') AS pending_users,
                    count(*) FILTER (WHERE status = 'active') AS active_users
                FROM users
            ),
            location_stats AS (
                SELECT
                    COALESCE(s.code, f.location, 'Tidak Diketahui') AS loc,
                    count(*) AS cnt
                FROM filtered f
                LEFT JOIN stations s ON f.station_id = s.id
                GROUP BY loc
                ORDER BY cnt DESC
                LIMIT 5
            )
            SELECT
                c.total, c.menunggu_feedback, c.sudah_diverifikasi, c.selesai,
                c.high_severity, c.medium_severity, c.low_severity, c.sla_breach,
                t.today, t.this_week, t.this_month,
                u.pending_users, u.active_users,
                COALESCE(json_agg(json_build_object('location', ls.loc, 'count', ls.cnt)) FILTER (WHERE ls.loc IS NOT NULL), '[]'::json) AS top_locations
            FROM counts c, trends t, user_counts u
            LEFT JOIN location_stats ls ON TRUE
            GROUP BY c.total, c.menunggu_feedback, c.sudah_diverifikasi, c.selesai,
                     c.high_severity, c.medium_severity, c.low_severity, c.sla_breach,
                     t.today, t.this_week, t.this_month,
                     u.pending_users, u.active_users
        `;

        const allParams = [
            ...params,
            now.toISOString(),
            startOfDay,
            startOfWeek,
            startOfMonth,
        ];

        // Run consolidated query + recent reports in parallel (2 queries instead of 15)
        const [statsResult, recentResult] = await Promise.all([
            supabaseAdmin.rpc('run_analytics_query', {
                query_text: sql,
                query_params: allParams,
            }),
            supabase.from('reports')
                .select('id, title, location, status, severity, created_at, priority, sla_deadline, users:user_id(full_name), stations:station_id(code)')
                .order('created_at', { ascending: false })
                .limit(5),
        ]);

        // Fallback to original approach if RPC fails
        if (statsResult.error) {
            console.error('CTE stats query failed, using fallback:', statsResult.error);
            return fallbackStats(request);
        }

        const row = statsResult.data?.[0] || {};
        const totalReports = Number(row.total) || 0;
        const selesai = Number(row.selesai) || 0;
        const resolutionRate = totalReports ? Math.round((selesai / totalReports) * 100) : 0;

        return NextResponse.json({
            overview: {
                totalReports,
                menungguFeedback: Number(row.menunggu_feedback) || 0,
                sudahDiverifikasi: Number(row.sudah_diverifikasi) || 0,
                selesai,
                pendingUsers: Number(row.pending_users) || 0,
                activeUsers: Number(row.active_users) || 0,
                resolutionRate,
                slaBreachCount: Number(row.sla_breach) || 0,
            },
            severity: {
                high: Number(row.high_severity) || 0,
                medium: Number(row.medium_severity) || 0,
                low: Number(row.low_severity) || 0,
            },
            trends: {
                today: Number(row.today) || 0,
                thisWeek: Number(row.this_week) || 0,
                thisMonth: Number(row.this_month) || 0,
            },
            recentReports: recentResult.data || [],
            topLocations: Array.isArray(row.top_locations) ? row.top_locations : [],
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
                'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
        });
    } catch (error) {
        console.error('Stats error:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}

// Fallback: original 15-query approach (used if CTE/RPC is unavailable)
async function fallbackStats(request: Request) {
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

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyDateFilter = (query: any) => {
        if (dateFrom) query = query.gte('created_at', dateFrom);
        if (dateTo) query = query.lte('created_at', dateTo);
        return query;
    };

    const [
        { count: totalReports },
        { count: menungguFeedback },
        { count: sudahDiverifikasi },
        { count: selesai },
        { count: pendingUsers },
        { count: activeUsers },
        { count: todayReports },
        { count: weekReports },
        { count: monthReports },
        { count: highSeverity },
        { count: mediumSeverity },
        { count: lowSeverity },
        { count: slaBreachCount },
        { data: recentReports },
        { data: locationStats },
    ] = await Promise.all([
        applyDateFilter(supabase.from('reports').select('*', { count: 'exact', head: true })),
        applyDateFilter(supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'MENUNGGU_FEEDBACK')),
        applyDateFilter(supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'SUDAH_DIVERIFIKASI')),
        applyDateFilter(supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'SELESAI')),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).gte('created_at', startOfDay),
        supabase.from('reports').select('*', { count: 'exact', head: true }).gte('created_at', startOfWeek),
        supabase.from('reports').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
        applyDateFilter(supabase.from('reports').select('*', { count: 'exact', head: true }).eq('severity', 'high')),
        applyDateFilter(supabase.from('reports').select('*', { count: 'exact', head: true }).eq('severity', 'medium')),
        applyDateFilter(supabase.from('reports').select('*', { count: 'exact', head: true }).eq('severity', 'low')),
        applyDateFilter(supabase.from('reports').select('*', { count: 'exact', head: true })
            .lt('sla_deadline', now.toISOString()).not('status', 'eq', 'SELESAI')),
        supabase.from('reports').select('id, title, location, status, severity, created_at, priority, sla_deadline, users:user_id(full_name), stations:station_id(code)').order('created_at', { ascending: false }).limit(5),
        applyDateFilter(supabase.from('reports').select('location, stations:station_id(code)')),
    ]);

    interface LocationStat {
        location: string | null;
        stations: { code: string } | { code: string }[] | null;
    }

    const locationBreakdown: Record<string, number> = {};
    (locationStats as unknown as LocationStat[] | null)?.forEach((report) => {
        const stationData = report.stations;
        const station = Array.isArray(stationData) ? stationData[0] : stationData;
        const loc = station?.code || report.location || 'Tidak Diketahui';
        locationBreakdown[loc] = (locationBreakdown[loc] || 0) + 1;
    });

    const topLocations = Object.entries(locationBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([location, count]) => ({ location, count }));

    const resolutionRate = totalReports ? Math.round(((selesai || 0) / totalReports) * 100) : 0;

    return NextResponse.json({
        overview: {
            totalReports: totalReports || 0,
            menungguFeedback: menungguFeedback || 0,
            sudahDiverifikasi: sudahDiverifikasi || 0,
            selesai: selesai || 0,
            pendingUsers: pendingUsers || 0,
            activeUsers: activeUsers || 0,
            resolutionRate,
            slaBreachCount: slaBreachCount || 0,
        },
        severity: {
            high: highSeverity || 0,
            medium: mediumSeverity || 0,
            low: lowSeverity || 0,
        },
        trends: {
            today: todayReports || 0,
            thisWeek: weekReports || 0,
            thisMonth: monthReports || 0,
        },
        recentReports: recentReports || [],
        topLocations,
    }, {
        headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
    });
}
