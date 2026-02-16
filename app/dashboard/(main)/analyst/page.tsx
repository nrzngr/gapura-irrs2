'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
    BarChart3, Clock, CheckCircle2,
    FileText, RefreshCw, Loader2, Plus,
    FileSpreadsheet, Eye, ArrowRight, Shield,
    AlertTriangle, ArrowUp, LayoutDashboard
} from 'lucide-react';

const AnalystCharts = dynamic(() => import('./AnalystCharts'), {
    ssr: false,
    loading: () => (
        <div className="min-h-[40vh] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 animate-spin" style={{ borderColor: 'var(--surface-4)', borderTopColor: 'var(--brand-primary)' }} />
        </div>
    ),
});

import { STATUS_CONFIG, type ReportStatus } from '@/lib/constants/report-status';
import { type Report } from '@/types';
import { cn } from '@/lib/utils';
import { ReportDetailModal } from '@/components/dashboard/ReportDetailModal';
import { PresentationSlide } from '@/components/dashboard/PresentationSlide';
import { exportToExcel as doExportExcel, exportToPDF as doExportPDF } from '@/lib/analyst-export';

// --- Types ---
interface AnalyticsData {
    summary: {
        totalReports: number;
        resolvedReports: number;
        pendingReports: number;
        highSeverity: number;
        avgResolutionRate: number;
        slaBreachCount?: number;
    };
    stationData: Array<{ station: string; total: number; resolved: number }>;
    statusData: Array<{ name: string; value: number; color: string }>;
    trendData: Array<{ month: string; total: number; resolved: number }>;
    divisionData?: Array<{ division: string; count: number }>;
    categoryData?: Array<{ category: string; count: number }>;
}

export default function AnalystDashboard() {
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
    const [dateRange, setDateRange] = useState<'all' | 'week' | 'month'>('all');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [customDashboards, setCustomDashboards] = useState<{ id: string; name: string; description: string | null; slug: string; created_at: string }[]>([]);
    const [cfLoading, setCfLoading] = useState(false);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            if (isRefresh) {
                // Invalidate server-side cache
                await fetch('/api/reports/refresh', { method: 'POST' });
            }

            const [reportsRes, analyticsRes] = await Promise.all([
                fetch('/api/admin/reports'),
                fetch('/api/admin/analytics')
            ]);

            if (reportsRes.ok) {
                const data = await reportsRes.json();
                setReports(Array.isArray(data) ? data : []);
            }
            if (analyticsRes.ok) {
                const data = await analyticsRes.json();
                setAnalytics(data);
            }
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Customer Feedback Dashboard shortcut handler
    const handleCustomerFeedbackShortcut = useCallback(async () => {
        setCfLoading(true);
        try {
            // Check localStorage for cached slug
            const cachedSlug = localStorage.getItem('cf_dashboard_slug');
            
            if (cachedSlug) {
                // Verify the dashboard still exists
                const checkRes = await fetch(`/api/dashboards?slug=${cachedSlug}`);
                
                if (checkRes.ok) {
                    const checkData = await checkRes.json();
                    if (checkData.dashboards?.length > 0) {
                        // Dashboard exists, navigate to it
                        router.push(`/embed/custom/${cachedSlug}`);
                        return;
                    }
                }
                
                // Dashboard not found, clear the cache
                console.log('[Customer Feedback] Cached dashboard not found, generating new one...');
                localStorage.removeItem('cf_dashboard_slug');
            }

            // Generate new dashboard without date range
            const res = await fetch('/api/dashboards/customer-feedback-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}), // No dateFrom/dateTo
            });

            if (!res.ok) {
                throw new Error('Failed to generate dashboard');
            }

            const data = await res.json();
            if (data.dashboard?.slug) {
                // Cache the slug
                localStorage.setItem('cf_dashboard_slug', data.dashboard.slug);
                router.push(`/embed/custom/${data.dashboard.slug}`);
            } else {
                throw new Error('No slug returned');
            }
        } catch (err) {
            console.error('Customer Feedback shortcut error:', err);
            alert('Gagal membuka Customer Feedback Dashboard. Silakan coba lagi.');
        } finally {
            setCfLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchData();
        fetch('/api/dashboards')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.dashboards) setCustomDashboards(data.dashboards); })
            .catch(() => {});
    }, [fetchData]);

    const filteredReports = useMemo(() => {
        if (dateRange === 'all') return reports;
        const now = new Date();
        const daysMap: Record<'week' | 'month', number> = { week: 7, month: 30 };
        const daysBack = daysMap[dateRange];
        const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
        return reports.filter(r => new Date(r.created_at) >= cutoffDate);
    }, [reports, dateRange]);

    // Helper to build drilldown URL with period context
    const drilldownUrl = (type: string, value: string) =>
        `/dashboard/analyst/drilldown?type=${type}&value=${encodeURIComponent(value)}&period=${dateRange}`;

    // ===== ANALYTICS DATA =====
    const caseCategoryData = useMemo(() => {
        const irregularity = filteredReports.filter(r => r.category === 'Irregularity').length;
        const complaint = filteredReports.filter(r => r.category === 'Complaint').length;
        const compliment = filteredReports.filter(r => r.category === 'Compliment').length;
        return [
            { name: 'Irregularity', value: irregularity, fill: '#10b981' },
            { name: 'Complaint', value: complaint, fill: '#ec4899' },
            { name: 'Compliment', value: compliment, fill: '#06b6d4' },
        ];
    }, [filteredReports]);

    const branchReportData = useMemo(() => {
        const stations: Record<string, number> = {};
        filteredReports.forEach(r => {
            const station = r.stations?.code || 'Unknown';
            stations[station] = (stations[station] || 0) + 1;
        });
        return Object.entries(stations)
            .map(([station, count]) => ({ station, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [filteredReports]);

    const monthlyReportData = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthData: Record<string, { irregularity: number; complaint: number; compliment: number }> = {};
        months.forEach(m => { monthData[m] = { irregularity: 0, complaint: 0, compliment: 0 }; });
        filteredReports.forEach(r => {
            const date = new Date(r.created_at);
            const month = months[date.getMonth()];
            if (r.category === 'Irregularity') monthData[month].irregularity++;
            else if (r.category === 'Complaint') monthData[month].complaint++;
            else if (r.category === 'Compliment') monthData[month].compliment++;
        });
        return months.map(month => ({ month, ...monthData[month] })).reverse();
    }, [filteredReports]);

    const categoryByAreaData = useMemo(() => {
        const areas: Record<string, number> = {};
        filteredReports.forEach(r => {
            const area = r.area || 'General';
            areas[area] = (areas[area] || 0) + 1;
        });
        const sorted = Object.entries(areas)
            .map(([area, count]) => ({ name: area, value: count }))
            .sort((a, b) => b.value - a.value);
        const fills = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
        return sorted.slice(0, 5).map((item, i) => ({ ...item, fill: fills[i % fills.length] }));
    }, [filteredReports]);

    const categoryByBranchData = useMemo(() => {
        const branchData: Record<string, { irregularity: number; complaint: number; compliment: number }> = {};
        filteredReports.forEach(r => {
            const branch = r.stations?.code || 'Unknown';
            if (!branchData[branch]) branchData[branch] = { irregularity: 0, complaint: 0, compliment: 0 };
            if (r.category === 'Irregularity') branchData[branch].irregularity++;
            else if (r.category === 'Complaint') branchData[branch].complaint++;
            else if (r.category === 'Compliment') branchData[branch].compliment++;
        });
        return Object.entries(branchData)
            .map(([branch, data]) => ({ branch, ...data }))
            .sort((a, b) => (b.irregularity + b.complaint + b.compliment) - (a.irregularity + a.complaint + a.compliment))
            .slice(0, 10);
    }, [filteredReports]);

    const categoryByAirlinesData = useMemo(() => {
        const airlinesData: Record<string, { irregularity: number; complaint: number; compliment: number }> = {};
        filteredReports.forEach(r => {
            const airline = r.airlines || 'Unknown';
            if (!airlinesData[airline]) airlinesData[airline] = { irregularity: 0, complaint: 0, compliment: 0 };
            if (r.category === 'Irregularity') airlinesData[airline].irregularity++;
            else if (r.category === 'Complaint') airlinesData[airline].complaint++;
            else if (r.category === 'Compliment') airlinesData[airline].compliment++;
        });
        return Object.entries(airlinesData)
            .map(([airline, data]) => ({ airline, ...data }))
            .sort((a, b) => (b.irregularity + b.complaint + b.compliment) - (a.irregularity + a.complaint + a.compliment))
            .slice(0, 8);
    }, [filteredReports]);

    const filteredStats = useMemo(() => {
        const total = filteredReports.length;
        const resolved = filteredReports.filter(r => r.status === 'SELESAI').length;
        const pending = filteredReports.filter(r => r.status === 'MENUNGGU_FEEDBACK').length;
        const highSeverity = filteredReports.filter(r => r.severity === 'high' || r.severity === 'urgent').length;
        const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
        return { total, resolved, pending, highSeverity, resolutionRate };
    }, [filteredReports]);

    const exportToExcel = async () => {
        setExporting('excel');
        try {
            await doExportExcel({ reports, filteredReports, analytics, dateRange });
        } finally {
            setExporting(null);
        }
    };

    const exportToPDF = async () => {
        setExporting('pdf');
        try {
            await doExportPDF({ reports, filteredReports, analytics, dateRange });
        } finally {
            setExporting(null);
        }
    };

    const pendingFeedback = filteredReports.filter(r => r.status === 'MENUNGGU_FEEDBACK');
    const todayCases = filteredReports.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString());



    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <div
                    className="w-12 h-12 rounded-full border-4 animate-spin"
                    style={{ borderColor: 'var(--surface-4)', borderTopColor: 'var(--brand-primary)' }}
                />
                <p className="text-sm text-[var(--text-muted)] mt-4 uppercase tracking-widest font-bold">Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 stagger-children snap-y">
            {/* Slide 1: Header + Stats + Export */}
            <PresentationSlide className="!p-0 !min-h-0 !bg-transparent !shadow-none !border-0">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 animate-fade-in-up">
                        <div className="flex-1">
                            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
                                Dashboard Analyst
                            </h1>
                            <p className="text-[var(--text-secondary)] mt-1">
                                Pusat Komando & Analytics Divisi Operational Services Center
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex bg-[var(--surface-2)] rounded-xl p-1 border border-[var(--surface-4)]">
                                {(['all', 'month', 'week'] as const).map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => setDateRange(range)}
                                        className={cn(
                                            "px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap",
                                            dateRange === range
                                                ? "bg-[var(--brand-primary)] text-white shadow-sm"
                                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                        )}
                                    >
                                        {range === 'all' ? 'Semua Waktu' : range === 'month' ? '30 Hari Terakhir' : '7 Hari Terakhir'}
                                    </button>
                                ))}
                            </div>

                            <button 
                                onClick={handleCustomerFeedbackShortcut}
                                disabled={cfLoading}
                                className={cn(
                                    "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                    "bg-gradient-to-r from-emerald-600 to-green-500 text-white hover:shadow-lg hover:shadow-emerald-500/25",
                                    cfLoading && "opacity-70 cursor-not-allowed"
                                )}
                            >
                                {cfLoading ? <Loader2 size={16} className="animate-spin" /> : <LayoutDashboard size={16} />}
                                Customer Feedback Dashboard
                            </button>
                            <button onClick={() => router.push('/dashboard/employee/new')} className="btn-primary">
                                <Plus size={16} /> Buat Laporan
                            </button>
                            <button
                                onClick={() => fetchData(true)}
                                disabled={refreshing}
                                className={cn(
                                    "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                                    "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]",
                                    refreshing && "opacity-50"
                                )}
                            >
                                <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
                                {refreshing ? 'Memuat...' : 'Refresh'}
                            </button>
                        </div>
                    </div>

                    {/* Pending Feedback Alert */}
                    {pendingFeedback.length > 0 && (
                        <div
                            className="card-solid flex items-center gap-4 animate-fade-in-up cursor-pointer"
                            style={{
                                background: 'oklch(0.60 0.15 250 / 0.08)',
                                border: '1px solid oklch(0.60 0.15 250 / 0.2)',
                                padding: 'var(--space-lg)'
                            }}
                            onClick={() => router.push(drilldownUrl('status', 'MENUNGGU_FEEDBACK'))}
                        >
                            <div className="p-3 rounded-xl" style={{ background: 'oklch(0.60 0.15 250 / 0.15)' }}>
                                <ShieldCheckCode size={24} style={{ color: 'oklch(0.50 0.15 250)' }} />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold" style={{ color: 'oklch(0.40 0.15 250)' }}>
                                    {pendingFeedback.length} Laporan Menunggu Feedback
                                </p>
                                <p className="text-sm" style={{ color: 'oklch(0.55 0.12 250)' }}>
                                    Perlu verifikasi dari analyst
                                </p>
                            </div>
                            <div
                                className="btn-primary"
                                style={{
                                    background: 'oklch(0.55 0.15 250)',
                                    boxShadow: '0 4px 16px oklch(0.55 0.15 250 / 0.3)'
                                }}
                            >
                                Review
                                <ArrowRight size={16} />
                            </div>
                        </div>
                    )}

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <StatCard title="Total Laporan" value={filteredStats.total} icon={FileText} color="blue" onClick={() => router.push(drilldownUrl('severity', 'all'))} />
                        <StatCard title="Diselesaikan" value={filteredStats.resolved} icon={CheckCircle2} color="green" onClick={() => router.push(drilldownUrl('status', 'SELESAI'))} />
                        <StatCard title="Menunggu" value={filteredStats.pending} icon={Clock} color="amber" onClick={() => router.push(drilldownUrl('status', 'MENUNGGU_FEEDBACK'))} />
                        <StatCard title="High Severity" value={filteredStats.highSeverity} icon={AlertTriangle} color="red" onClick={() => router.push(drilldownUrl('severity', 'high'))} />
                    </div>

                    {/* Export Actions */}
                    <div className="flex gap-3 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                        <button
                            onClick={exportToExcel}
                            disabled={exporting !== null}
                            className={cn(
                                "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100",
                                exporting === 'excel' && "opacity-50"
                            )}
                        >
                            {exporting === 'excel' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                            Download Excel
                        </button>
                        <button
                            onClick={exportToPDF}
                            disabled={exporting !== null}
                            className={cn(
                                "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
                                exporting === 'pdf' && "opacity-50"
                            )}
                        >
                            {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                            Download PDF
                        </button>
                    </div>
                </div>
            </PresentationSlide>

            {/* Charts: lazy-loaded to keep Recharts out of the initial compile graph */}
            <AnalystCharts
                analytics={analytics}
                caseCategoryData={caseCategoryData}
                branchReportData={branchReportData}
                monthlyReportData={monthlyReportData}
                categoryByAreaData={categoryByAreaData}
                categoryByBranchData={categoryByBranchData}
                categoryByAirlinesData={categoryByAirlinesData}
                filteredReports={filteredReports}
                onDrilldown={(url) => router.push(url)}
                drilldownUrl={drilldownUrl}
            />

            {/* Slide 8: Reports Table */}
            <PresentationSlide
                title="Laporan Hari Ini"
                subtitle={`${todayCases.length} laporan hari ini`}
                icon={FileText}
            >
                <div className="card-solid p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--surface-4)]">
                                    <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">ID</th>
                                    <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">Judul</th>
                                    <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">Status</th>
                                    <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">Severity</th>
                                    <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">Stasiun</th>
                                    <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">Tanggal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {todayCases.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                                            Tidak ada laporan hari ini
                                        </td>
                                    </tr>
                                ) : (
                                    todayCases.slice(0, 10).map((r) => (
                                        <tr key={r.id} className="border-b border-[var(--surface-4)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer" onClick={() => setSelectedReport(r)}>
                                            <td className="p-4 font-mono text-sm">{r.id.slice(0, 8)}</td>
                                            <td className="p-4 text-sm font-medium text-[var(--text-primary)] max-w-[300px] truncate">{r.title}</td>
                                            <td className="p-4">
                                                <span
                                                    className="px-2 py-1 rounded-full text-[10px] font-bold uppercase"
                                                    style={{
                                                        color: STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG]?.color,
                                                        backgroundColor: STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG]?.bgColor
                                                    }}
                                                >
                                                    {STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG]?.label || r.status}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={cn(
                                                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                                    r.severity === 'high' || r.severity === 'urgent' ? "bg-red-100 text-red-700" :
                                                    r.severity === 'medium' ? "bg-amber-100 text-amber-700" :
                                                    "bg-green-100 text-green-700"
                                                )}>
                                                    {r.severity}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-[var(--text-secondary)]">{r.stations?.code || r.branch || '-'}</td>
                                            <td className="p-4 text-sm text-[var(--text-muted)]">{new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </PresentationSlide>

            {/* Custom Dashboards */}
            {customDashboards.length > 0 && (
                <PresentationSlide
                    title="Custom Dashboard"
                    subtitle="Dashboard kustom yang dibuat oleh Analyst"
                    icon={BarChart3}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {customDashboards.map(d => (
                            <a
                                key={d.id}
                                href={`/embed/custom/${d.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="card-solid p-4 hover:bg-[var(--surface-2)] transition-colors group"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                                        {d.name}
                                    </h4>
                                    <Eye size={14} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                                </div>
                                {d.description && (
                                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-2">{d.description}</p>
                                )}
                                <p className="text-[10px] text-[var(--text-muted)]">
                                    {new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            </a>
                        ))}
                        <Link
                            href="/dashboard/analyst/builder"
                            className="card-solid p-4 border-dashed flex flex-col items-center justify-center gap-2 hover:bg-[var(--surface-2)] transition-colors min-h-[100px]"
                        >
                            <Plus size={20} className="text-[var(--text-muted)]" />
                            <span className="text-xs font-medium text-[var(--text-muted)]">Buat Dashboard Baru</span>
                        </Link>
                    </div>
                </PresentationSlide>
            )}

            {/* Report Detail Modal */}
            <ReportDetailModal
                isOpen={!!selectedReport}
                onClose={() => setSelectedReport(null)}
                report={selectedReport}
                userRole="ANALYST"
            />
        </div>
    );
}

// Icon helper
const ShieldCheckCode = ({ size, style }: { size: number, style: React.CSSProperties }) => (
    <Shield size={size} style={style} />
);

// Stat Card Component
function StatCard({
    title,
    value,
    icon: Icon,
    color,
    trend,
    onClick,
}: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: 'blue' | 'green' | 'purple' | 'red' | 'amber' | 'emerald';
    trend?: string;
    onClick?: () => void;
}) {
    const colorMap = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
        green: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
        red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    };
    const c = colorMap[color];

    return (
        <div
            className={cn("card-solid p-4 border transition-colors", c.border, onClick && "cursor-pointer hover:bg-[var(--surface-2)]")}
            onClick={onClick}
        >
            <div className="flex items-center justify-between mb-2">
                <div className={cn("p-1.5 rounded-lg", c.bg)}>
                    <Icon size={14} className={c.text} />
                </div>
                {trend && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <ArrowUp size={10} />
                        {trend}
                    </span>
                )}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">{title}</p>
            <p className="text-xl lg:text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        </div>
    );
}
