import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        // Get current date info
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // Parallel queries for comprehensive stats
        const [
            { count: totalReports },
            { count: pendingReports },
            { count: reviewedReports },
            { count: resolvedReports },
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
            supabase.from('reports').select('*', { count: 'exact', head: true }),
            supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'reviewed'),
            supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('reports').select('*', { count: 'exact', head: true }).gte('created_at', startOfDay),
            supabase.from('reports').select('*', { count: 'exact', head: true }).gte('created_at', startOfWeek),
            supabase.from('reports').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
            supabase.from('reports').select('*', { count: 'exact', head: true }).eq('severity', 'high'),
            supabase.from('reports').select('*', { count: 'exact', head: true }).eq('severity', 'medium'),
            supabase.from('reports').select('*', { count: 'exact', head: true }).eq('severity', 'low'),
            // SLA Breach: Reports past deadline that are not closed
            supabase.from('reports').select('*', { count: 'exact', head: true })
                .lt('sla_deadline', now.toISOString())
                .not('status', 'eq', 'CLOSED'),
            supabase.from('reports').select('id, title, location, status, severity, created_at, priority, sla_deadline, users:user_id(full_name), stations:station_id(code)').order('created_at', { ascending: false }).limit(5),
            supabase.from('reports').select('location, stations:station_id(code)'),
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
        const resolutionRate = totalReports ? Math.round(((resolvedReports || 0) / totalReports) * 100) : 0;

        return NextResponse.json({
            overview: {
                totalReports: totalReports || 0,
                pendingReports: pendingReports || 0,
                reviewedReports: reviewedReports || 0,
                resolvedReports: resolvedReports || 0,
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
