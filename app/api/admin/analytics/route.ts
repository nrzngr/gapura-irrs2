import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        // Get all reports with station info
        const { data: reports } = await supabase
            .from('reports')
            .select(`
        id, status, severity, created_at,
        stations:station_id (code, name),
        incident_types:incident_type_id (name)
      `);

        // Get all stations for dropdown
        const { data: stationsList } = await supabase
            .from('stations')
            .select('code, name')
            .order('code');

        if (!reports) {
            return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
        }

        // Station-wise breakdown
        const stationStats: Record<string, { total: number; resolved: number; pending: number; reviewed: number; high: number; medium: number; low: number }> = {};

        reports.forEach((report: any) => {
            const stationCode = report.stations?.code || 'Unknown';
            if (!stationStats[stationCode]) {
                stationStats[stationCode] = { total: 0, resolved: 0, pending: 0, reviewed: 0, high: 0, medium: 0, low: 0 };
            }
            stationStats[stationCode].total++;
            if (report.status === 'resolved') stationStats[stationCode].resolved++;
            if (report.status === 'pending') stationStats[stationCode].pending++;
            if (report.status === 'reviewed') stationStats[stationCode].reviewed++;
            if (report.severity === 'high') stationStats[stationCode].high++;
            if (report.severity === 'medium') stationStats[stationCode].medium++;
            if (report.severity === 'low') stationStats[stationCode].low++;
        });

        const stationData = Object.entries(stationStats)
            .map(([station, stats]) => ({
                station,
                ...stats,
                resolutionRate: stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0
            }))
            .sort((a, b) => b.total - a.total);

        // Monthly trend (last 6 months)
        const monthlyTrend: Record<string, { month: string; total: number; resolved: number; high: number }> = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
            monthlyTrend[key] = { month: monthName, total: 0, resolved: 0, high: 0 };
        }

        reports.forEach((report: any) => {
            const date = new Date(report.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyTrend[key]) {
                monthlyTrend[key].total++;
                if (report.status === 'resolved') monthlyTrend[key].resolved++;
                if (report.severity === 'high') monthlyTrend[key].high++;
            }
        });

        const trendData = Object.values(monthlyTrend);

        // Severity distribution
        const severityData = [
            { name: 'High', value: reports.filter((r: any) => r.severity === 'high').length, color: '#ef4444' },
            { name: 'Medium', value: reports.filter((r: any) => r.severity === 'medium').length, color: '#f59e0b' },
            { name: 'Low', value: reports.filter((r: any) => r.severity === 'low').length, color: '#10b981' },
        ];

        // Status distribution  
        const statusData = [
            { name: 'Menunggu', value: reports.filter((r: any) => r.status === 'pending').length, color: '#f59e0b' },
            { name: 'Ditinjau', value: reports.filter((r: any) => r.status === 'reviewed').length, color: '#3b82f6' },
            { name: 'Selesai', value: reports.filter((r: any) => r.status === 'resolved').length, color: '#10b981' },
        ];

        // Incident type breakdown
        const incidentStats: Record<string, number> = {};
        reports.forEach((report: any) => {
            const typeName = report.incident_types?.name || 'Lainnya';
            incidentStats[typeName] = (incidentStats[typeName] || 0) + 1;
        });

        const incidentData = Object.entries(incidentStats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);

        // Overall stats
        const totalReports = reports.length;
        const resolvedReports = reports.filter((r: any) => r.status === 'resolved').length;
        const pendingReports = reports.filter((r: any) => r.status === 'pending').length;
        const highSeverity = reports.filter((r: any) => r.severity === 'high').length;
        const avgResolutionRate = totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0;

        return NextResponse.json({
            stationData,
            trendData,
            severityData,
            statusData,
            incidentData,
            stations: stationsList || [],
            summary: {
                totalReports,
                resolvedReports,
                pendingReports,
                highSeverity,
                avgResolutionRate,
                stationCount: Object.keys(stationStats).length
            }
        });
    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
