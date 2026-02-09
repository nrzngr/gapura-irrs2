import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period'); // 7d, 30d, 3m, 6m
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

        // Get current date info
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // Helper to apply date filters to a query
        const applyDateFilter = (query: any) => {
            if (dateFrom) query = query.gte('created_at', dateFrom);
            if (dateTo) query = query.lte('created_at', dateTo);
            return query;
        };

        // Parallel queries for comprehensive stats
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
            // SLA Breach: Reports past deadline that are not SELESAI
            applyDateFilter(supabase.from('reports').select('*', { count: 'exact', head: true })
                .lt('sla_deadline', now.toISOString())
                .not('status', 'eq', 'SELESAI')),
            supabase.from('reports').select('id, title, location, status, severity, created_at, priority, sla_deadline, users:user_id(full_name), stations:station_id(code)').order('created_at', { ascending: false }).limit(5),
            applyDateFilter(supabase.from('reports').select('location, stations:station_id(code)')),
        ]);

        // Calculate location breakdown
        const locationBreakdown: Record<string, number> = {};
        locationStats?.forEach((report: any) => {
            const station = Array.isArray(report.stations) ? report.stations[0] : report.stations;
            const loc = station?.code || report.location || 'Tidak Diketahui';
            locationBreakdown[loc] = (locationBreakdown[loc] || 0) + 1;
        });

        // Sort locations by count and get top 5
        const topLocations = Object.entries(locationBreakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([location, count]) => ({ location, count }));

        // Calculate resolution rate
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
        });
    } catch (error) {
        console.error('Stats error:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
