'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
    Clock, CheckCircle2,
    FileText, RefreshCw, Loader2, Plus,
    FileSpreadsheet, ArrowRight, Shield,
    AlertTriangle, ArrowUp, LayoutDashboard,
    Plane, ClipboardList, Search
} from 'lucide-react';

const AnalystCharts = dynamic(() => import('./analyst/AnalystCharts'), {
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
import { exportToExcel as doExportExcel, exportToPDF as doExportPDF } from '@/lib/analyst-export';
import { CustomerFeedbackFilterModal } from './analyst/CustomerFeedbackFilterModal';
import { NoiseTexture } from '@/components/ui/NoiseTexture';

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

export interface DivisionConfig {
    code: string;
    name: string;
    color: string;
    gradient: string;
    bgLight: string;
    textColor: string;
}

interface AnalyticsDashboardProps {
    division: DivisionConfig;
    showGenerateFeedback?: boolean;
}

export function AnalyticsDashboard({ division, showGenerateFeedback = true }: AnalyticsDashboardProps) {
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
    const [dateRange, setDateRange] = useState<'all' | 'week' | 'month'>('all');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [cfLoading, setCfLoading] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filterLoading, setFilterLoading] = useState(false);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            if (isRefresh) {
                // Invalidate server-side cache
                await fetch('/api/reports/refresh', { method: 'POST' });
            }

            const queryParams = new URLSearchParams();
            if (division.code !== 'ALL') {
                queryParams.set('division', division.code);
            }

            const [reportsRes, analyticsRes] = await Promise.all([
                fetch(`/api/admin/reports?${queryParams.toString()}`),
                fetch(`/api/admin/analytics?${queryParams.toString()}`)
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
    }, [division.code]);

    const handleCustomerFeedbackShortcut = useCallback(async () => {
        setCfLoading(true);
        try {
            const res = await fetch('/api/dashboards/customer-feedback-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filters: {
                        division: division.code
                    }
                }), 
            });

            if (!res.ok) throw new Error('Failed to generate dashboard');

            const data = await res.json();
            if (data.dashboard?.slug) {
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
    }, [fetchData]);

    const filteredReportsList = useMemo(() => {
        let result = reports;
        
        // Date range filter
        if (dateRange !== 'all') {
            const now = new Date();
            const daysMap: Record<'week' | 'month', number> = { week: 7, month: 30 };
            const daysBack = daysMap[dateRange];
            const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
            result = result.filter(r => new Date(r.created_at) >= cutoffDate);
        }

        // Search query filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(r => 
                (r.report || r.title || '').toLowerCase().includes(query) ||
                (r.airlines || r.airline || '').toLowerCase().includes(query) ||
                (r.flight_number || '').toLowerCase().includes(query) ||
                (r.branch || r.station_code || '').toLowerCase().includes(query)
            );
        }

        return result;
    }, [reports, dateRange, searchQuery]);

    const drilldownUrl = (type: string, value: string) =>
        `/dashboard/analyst/drilldown?type=${type}&value=${encodeURIComponent(value)}&period=${dateRange}`;

    // --- Chart Data Preparation (Copied from Analyst page) ---
    const caseCategoryData = useMemo(() => {
        const irregularity = filteredReportsList.filter(r => r.category === 'Irregularity').length;
        const complaint = filteredReportsList.filter(r => r.category === 'Complaint').length;
        const compliment = filteredReportsList.filter(r => r.category === 'Compliment').length;
        return [
            { name: 'Irregularity', value: irregularity, fill: '#10b981' },
            { name: 'Complaint', value: complaint, fill: '#ec4899' },
            { name: 'Compliment', value: compliment, fill: '#06b6d4' },
        ];
    }, [filteredReportsList]);

    const branchReportData = useMemo(() => {
        const stations: Record<string, number> = {};
        filteredReportsList.forEach(r => {
            const station = r.station_code || r.branch || 'Unknown';
            stations[station] = (stations[station] || 0) + 1;
        });
        return Object.entries(stations)
            .map(([station, count]) => ({ station, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [filteredReportsList]);

    const monthlyReportData = useMemo(() => {
        const dataMap = new Map<string, { irregularity: number; complaint: number; compliment: number; date: Date }>();
        filteredReportsList.forEach(r => {
            const d = new Date(r.created_at);
            if (isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!dataMap.has(key)) dataMap.set(key, { irregularity: 0, complaint: 0, compliment: 0, date: d });
            const entry = dataMap.get(key)!;
            if (r.category === 'Irregularity') entry.irregularity++;
            else if (r.category === 'Complaint') entry.complaint++;
            else if (r.category === 'Compliment') entry.compliment++;
        });
        return Array.from(dataMap.entries())
            .sort((a, b) => b[0].localeCompare(a[0])) 
            .map(([_, val]) => ({
                month: val.date.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
                irregularity: val.irregularity,
                complaint: val.complaint,
                compliment: val.compliment
            }))
            .slice(0, 12);
    }, [filteredReportsList]);

    const categoryByAreaData = useMemo(() => {
        const areas: Record<string, number> = {};
        filteredReportsList.forEach(r => {
            const area = r.area || 'General';
            areas[area] = (areas[area] || 0) + 1;
        });
        return Object.entries(areas)
            .map(([area, count]) => ({ name: area, value: count }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
            .map((item, i) => ({ ...item, fill: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'][i % 5] }));
    }, [filteredReportsList]);

    const areaSubCategoryData = useMemo(() => {
        const areaMap: Record<string, Record<string, number>> = {};
        filteredReportsList.forEach(r => {
            const area = r.area || 'General';
            const sub = r.main_category || 'Other';
            if (!areaMap[area]) areaMap[area] = {};
            areaMap[area][sub] = (areaMap[area][sub] || 0) + 1;
        });

        return Object.entries(areaMap).map(([area, subs]) => ({
            area,
            ...subs
        })).sort((a, b) => {
            const sumA = Object.values(a).reduce((acc: number, v) => typeof v === 'number' ? acc + v : acc, 0);
            const sumB = Object.values(b).reduce((acc: number, v) => typeof v === 'number' ? acc + v : acc, 0);
            return sumB - sumA;
        }).slice(0, 10);
    }, [filteredReportsList]);

    const categoryByBranchData = useMemo(() => {
        const branchData: Record<string, { irregularity: number; complaint: number; compliment: number }> = {};
        filteredReportsList.forEach(r => {
            const branch = r.station_code || r.branch || 'Unknown';
            if (!branchData[branch]) branchData[branch] = { irregularity: 0, complaint: 0, compliment: 0 };
            if (r.category === 'Irregularity') branchData[branch].irregularity++;
            else if (r.category === 'Complaint') branchData[branch].complaint++;
            else if (r.category === 'Compliment') branchData[branch].compliment++;
        });
        return Object.entries(branchData)
            .map(([branch, data]) => ({ branch, ...data }))
            .sort((a, b) => (b.irregularity + b.complaint + b.compliment) - (a.irregularity + a.complaint + a.compliment))
            .slice(0, 10);
    }, [filteredReportsList]);

    const categoryByAirlinesData = useMemo(() => {
        const airlinesData: Record<string, { irregularity: number; complaint: number; compliment: number }> = {};
        filteredReportsList.forEach(r => {
            const airline = r.airlines || r.airline || 'Unknown';
            if (!airlinesData[airline]) airlinesData[airline] = { irregularity: 0, complaint: 0, compliment: 0 };
            if (r.category === 'Irregularity') airlinesData[airline].irregularity++;
            else if (r.category === 'Complaint') airlinesData[airline].complaint++;
            else if (r.category === 'Compliment') airlinesData[airline].compliment++;
        });
        return Object.entries(airlinesData)
            .map(([airline, data]) => ({ airline, ...data }))
            .sort((a, b) => (b.irregularity + b.complaint + b.compliment) - (a.irregularity + a.complaint + a.compliment))
            .slice(0, 8);
    }, [filteredReportsList]);

    const topReportersData = useMemo(() => {
        const reporterMap: Record<string, { name: string; station: string; count: number }> = {};
        filteredReportsList.forEach(r => {
            const name = r.reporter_name || 'Unknown';
            const station = r.station_code || r.branch || '-';
            if (!reporterMap[name]) reporterMap[name] = { name, station, count: 0 };
            reporterMap[name].count++;
        });
        return Object.values(reporterMap).sort((a, b) => b.count - a.count).slice(0, 10);
    }, [filteredReportsList]);

    const monthlyComparisonData = useMemo(() => {
        const dataMap = new Map<string, { masuk: number; selesai: number; date: Date }>();
        filteredReportsList.forEach(r => {
            const dCreated = new Date(r.created_at);
            if (!isNaN(dCreated.getTime())) {
                const key = `${dCreated.getFullYear()}-${String(dCreated.getMonth() + 1).padStart(2, '0')}`;
                if (!dataMap.has(key)) dataMap.set(key, { masuk: 0, selesai: 0, date: dCreated });
                dataMap.get(key)!.masuk++;
            }
            if (r.resolved_at) {
                const dResolved = new Date(r.resolved_at);
                if (!isNaN(dResolved.getTime())) {
                    const key = `${dResolved.getFullYear()}-${String(dResolved.getMonth() + 1).padStart(2, '0')}`;
                    if (!dataMap.has(key)) dataMap.set(key, { masuk: 0, selesai: 0, date: dResolved });
                    dataMap.get(key)!.selesai++;
                }
            }
        });
        return Array.from(dataMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0])) 
            .map(([_, val]) => ({
                month: val.date.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
                masuk: val.masuk,
                selesai: val.selesai,
                rate: val.masuk > 0 ? Math.round((val.selesai / val.masuk) * 100) : 0
            }))
            .slice(-12);
    }, [filteredReportsList]);

    const hubDistributionData = useMemo(() => {
        const hubMap: Record<string, number> = {};
        filteredReportsList.forEach(r => {
            const hub = r.hub || 'Unknown';
            hubMap[hub] = (hubMap[hub] || 0) + 1;
        });
        return Object.entries(hubMap).map(([hub, count]) => ({ hub, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    }, [filteredReportsList]);

    const resolutionByBranchData = useMemo(() => {
        const branchMap: Record<string, { total: number; resolved: number }> = {};
        filteredReportsList.forEach(r => {
            const branch = r.station_code || r.branch || 'Unknown';
            if (!branchMap[branch]) branchMap[branch] = { total: 0, resolved: 0 };
            branchMap[branch].total++;
            if (r.status === 'SELESAI') branchMap[branch].resolved++;
        });
        return Object.entries(branchMap).map(([branch, data]) => ({
            branch,
            total: data.total,
            resolved: data.resolved,
            rate: data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0,
        })).sort((a, b) => b.total - a.total).slice(0, 10);
    }, [filteredReportsList]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                    <div className={`absolute inset-0 ${division.bgLight} rounded-full blur-xl animate-pulse`} />
                    <Loader2 className={`w-12 h-12 animate-spin ${division.textColor} relative`} />
                </div>
                <p className="text-[var(--text-secondary)] tracking-widest uppercase text-xs font-bold">
                    Loading {division.name}...
                </p>
            </div>
        );
    }

    return (
        <div className="px-3 sm:px-6 py-6 sm:py-8 lg:p-12 space-y-6 sm:space-y-8 lg:space-y-12 pb-24 stagger-children overflow-x-hidden">
            <header className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10 animate-fade-in-up bg-gradient-to-br ${division.gradient}`}>
                <NoiseTexture />
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-2xl" />
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30">
                                <Plane size={14} className="text-white" />
                                <span className="text-white text-xs font-bold uppercase tracking-wider">{division.code}</span>
                            </span>
                        </div>
                        <h1 className="text-xl xs:text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-2 leading-tight break-words">
                            Dashboard {division.name}
                        </h1>
                        <p className="text-white/80 text-xs sm:text-sm">Pusat Komando & Analytics Operational Services</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                        {showGenerateFeedback && (
                            <button 
                                onClick={handleCustomerFeedbackShortcut}
                                disabled={cfLoading}
                                title="Customer Feedback Dashboard"
                                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all bg-white text-[var(--brand-primary)] hover:bg-white/90 shadow-xl disabled:opacity-50"
                            >
                                {cfLoading ? <Loader2 size={16} className="animate-spin" /> : <LayoutDashboard size={16} />}
                                <span className="hidden sm:inline">Customer Feedback</span>
                                <span className="sm:hidden">Feedback</span>
                            </button>
                        )}
                        <button 
                            onClick={() => setShowFilterModal(true)} 
                            title="Filter Laporan"
                            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-sm"
                        >
                            <Plus size={16} /> 
                            <span className="hidden sm:inline">Filter L&A</span>
                            <span className="sm:hidden">Filter</span>
                        </button>
                        <button 
                            onClick={() => fetchData(true)} 
                            disabled={refreshing} 
                            title="Refresh Data"
                            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-sm disabled:opacity-50"
                        >
                            {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                    </div>
                </div>

                <div className="relative z-10 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-8 pt-6 border-t border-white/20">
                    <MiniStat icon={FileText} label="Total Laporan" value={analytics?.summary.totalReports || 0} />
                    <MiniStat icon={CheckCircle2} label="Selesai" value={analytics?.summary.resolvedReports || 0} />
                    <MiniStat icon={Clock} label="Pending" value={analytics?.summary.pendingReports || 0} highlight />
                    <MiniStat icon={AlertTriangle} label="High Severity" value={analytics?.summary.highSeverity || 0} />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
                <div className="md:col-span-3">
                     <AnalystCharts
                        analytics={analytics}
                        caseCategoryData={caseCategoryData}
                        branchReportData={branchReportData}
                        monthlyReportData={monthlyReportData}
                        categoryByAreaData={categoryByAreaData}
                        categoryByBranchData={categoryByBranchData}
                        areaSubCategoryData={areaSubCategoryData}
                        categoryByAirlinesData={categoryByAirlinesData}
                        topReportersData={topReportersData}
                        monthlyComparisonData={monthlyComparisonData}
                        hubDistributionData={hubDistributionData}
                        resolutionByBranchData={resolutionByBranchData}
                        filteredReports={filteredReportsList}
                        onDrilldown={(url) => router.push(url)}
                        drilldownUrl={drilldownUrl}
                    />
                </div>
            </div>

            <div className="card-solid p-0 overflow-hidden animate-fade-in-up">
                <div className={cn("p-4 sm:p-6 border-b border-[var(--surface-4)]", division.bgLight)}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <ClipboardList size={20} className={division.textColor} />
                            <div>
                                <h3 className="font-bold text-base sm:text-lg text-[var(--text-primary)]">Daftar Laporan</h3>
                                <p className="text-[10px] sm:text-xs text-[var(--text-muted)]">{filteredReportsList.length} laporan ditampilkan</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="relative flex-1 sm:min-w-[240px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] border-none" size={14} />
                                <input
                                    type="text"
                                    placeholder="Cari maskapai, flight..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white border border-[var(--surface-4)] rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                                />
                            </div>
                            <div className="flex bg-[var(--surface-3)] p-1 rounded-xl border border-[var(--surface-4)] self-start sm:self-auto">
                                {(['all', 'week', 'month'] as const).map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => setDateRange(r)}
                                        className={cn(
                                            "px-3 py-1 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase transition-all",
                                            dateRange === r ? "bg-white text-[var(--brand-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                                        )}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--surface-4)]">
                                <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">Maskapai / Flight</th>
                                <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">Tanggal Kejadian</th>
                                <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">Cabang</th>
                                <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReportsList.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">Tidak ada laporan ditemukan</td></tr>
                            ) : (
                                filteredReportsList.map((r) => (
                                    <tr key={r.id} className="border-b border-[var(--surface-4)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer" onClick={() => setSelectedReport(r)}>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5">
                                                    {r.primary_tag === 'CGO' ? (
                                                        <span className="text-[8px] font-extrabold px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">CGO</span>
                                                    ) : (
                                                        <span className="text-[8px] font-extrabold px-1 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 uppercase">L&A</span>
                                                    )}
                                                    <span className="text-[10px] font-bold text-[var(--text-primary)]">{r.airlines || r.airline || '-'}</span>
                                                </div>
                                                <span className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[200px]">{r.report || r.title || '-'}</span>
                                                <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono">{r.flight_number || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-[var(--text-secondary)] font-medium">
                                            {r.date_of_event ? new Date(r.date_of_event).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                        </td>
                                        <td className="p-4 text-sm text-[var(--text-secondary)]">{r.branch || r.station_code || '-'}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase" style={{ color: STATUS_CONFIG[r.status as ReportStatus]?.color, backgroundColor: STATUS_CONFIG[r.status as ReportStatus]?.bgColor }}>
                                                {STATUS_CONFIG[r.status as ReportStatus]?.label || r.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ReportDetailModal
                isOpen={!!selectedReport}
                onClose={() => setSelectedReport(null)}
                report={selectedReport}
            />

            <CustomerFeedbackFilterModal
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                onApply={async (config: any) => {
                    setFilterLoading(true);
                    try {
                        const res = await fetch('/api/dashboards/customer-feedback-generate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                ...config,
                                filters: {
                                    ...config.filters,
                                    division: division.code
                                }
                            }),
                        });
                        if (!res.ok) throw new Error('Gagal membuat dashboard');
                        const data = await res.json();
                        router.push(`/embed/custom/${data.dashboard.slug}`);
                    } catch (err) {
                        alert('Gagal membuat dashboard terfilter');
                    } finally {
                        setFilterLoading(false);
                    }
                }}
                loading={filterLoading}
                availableHubs={[]}
                availableBranches={[]}
                availableAirlines={[]}
                availableCategories={[]}
            />
        </div>
    );
}

function MiniStat({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string | number; highlight?: boolean }) {
    return (
        <div className="flex items-center gap-2 sm:gap-3">
            <div className={cn("p-2 sm:p-2.5 rounded-lg sm:rounded-xl", highlight ? "bg-white/30" : "bg-white/20")}>
                <Icon size={16} className="text-white sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="min-w-0">
                <p className="text-white/70 text-[8px] sm:text-[10px] uppercase tracking-wider font-medium truncate">{label}</p>
                <p className="text-white text-base sm:text-xl font-bold leading-tight">{value}</p>
            </div>
        </div>
    );
}
