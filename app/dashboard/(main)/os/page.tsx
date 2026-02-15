'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Eye, TrendingUp } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

import { STATUS_CONFIG, type ReportStatus } from '@/lib/constants/report-status';
import { cn } from '@/lib/utils';
import { Report } from '@/types';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { type TimePeriod } from '@/components/dashboard/TimePeriodFilter';
import { PresentationSlide } from '@/components/dashboard/PresentationSlide';
import { ReportDetailModal } from '@/components/dashboard/ReportDetailModal';

interface AnalyticsData {
    summary: {
        totalReports: number;
        resolvedReports: number;
        pendingReports: number;
        highSeverity: number;
        avgResolutionRate: number;
    };
    stationData: Array<{ station: string; total: number; resolved: number }>;
    statusData: Array<{ name: string; value: number; color: string }>;
    trendData: Array<{ month: string; total: number; resolved: number }>;
}

export default function OSDashboard() {
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<TimePeriod>(null);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const analyticsUrl = period
                ? `/api/admin/analytics?period=${period}`
                : '/api/admin/analytics';

            const [reportsRes, analyticsRes] = await Promise.all([
                fetch('/api/admin/reports'),
                fetch(analyticsUrl)
            ]);

            if (reportsRes.ok) {
                const data = await reportsRes.json();
                setReports(Array.isArray(data) ? data : []);
            }
            if (analyticsRes.ok) {
                setAnalytics(await analyticsRes.json());
            }
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePeriodChange = (newPeriod: TimePeriod) => {
        setPeriod(newPeriod);
    };

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string | number }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 backdrop-blur-md p-3 border border-gray-200 rounded-xl shadow-xl">
                    <p className="text-xs font-bold text-gray-900 mb-1">{label}</p>
                    {payload.map((entry, idx) => (
                        <p key={idx} className="text-xs" style={{ color: entry.color }}>
                            {entry.name}: <span className="font-bold">{entry.value}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
                    <Loader2 className="w-12 h-12 animate-spin text-emerald-600 relative" />
                </div>
                <p className="text-[var(--text-secondary)] tracking-widest uppercase text-xs font-bold">
                    Loading Dashboard...
                </p>
            </div>
        );
    }

    const pendingCount = analytics?.summary.pendingReports || 0;
    const resolvedCount = analytics?.summary.resolvedReports || 0;
    const totalCount = analytics?.summary.totalReports || 0;

    // Map status names to status keys for drilldown
    const statusNameToKey: Record<string, string> = {
        'Menunggu Feedback': 'MENUNGGU_FEEDBACK',
        'Sudah Diverifikasi': 'SUDAH_DIVERIFIKASI',
        'Selesai': 'SELESAI',
    };

    return (
        <div className="space-y-6 pb-24 stagger-children snap-y">
            {/* Slide 1: Header */}
            <PresentationSlide className="!p-0 !min-h-0 !bg-transparent !shadow-none !border-0">
                <DashboardHeader
                    title="Dashboard Monitoring"
                    subtitle="Monitoring real-time laporan Divisi Operasional"
                    totalReports={totalCount}
                    pendingReports={pendingCount}
                    resolvedReports={resolvedCount}
                    period={period}
                    onPeriodChange={handlePeriodChange}
                />
            </PresentationSlide>

            {/* Slide 2: Tren Laporan (Area) + Distribusi Status (Pie) */}
            <PresentationSlide
                title="Tren & Distribusi"
                subtitle="Volume laporan dan distribusi status"
                icon={TrendingUp}
                hint="Klik chart untuk melihat detail laporan"
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Trend Chart */}
                    <div className="card-solid lg:col-span-2 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Tren Laporan</h3>
                                <p className="text-xs text-[var(--text-muted)]">Volume per bulan</p>
                            </div>
                            <TrendingUp size={20} className="text-emerald-600" />
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={analytics?.trendData}
                                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                    onClick={(state) => {
                                        if (state?.activeLabel) {
                                            router.push(`/dashboard/os/drilldown?type=trend_month&value=${String(state.activeLabel)}`);
                                        }
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-4)" />
                                    <XAxis dataKey="month" tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="total"
                                        name="Total"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorTotal)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Status Distribution */}
                    <div className="card-solid p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Distribusi Status</h3>
                                <p className="text-xs text-[var(--text-muted)]">Status saat ini</p>
                            </div>
                            <Eye size={20} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="h-[250px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={analytics?.statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={95}
                                        paddingAngle={4}
                                        dataKey="value"
                                        cornerRadius={8}
                                        stroke="none"
                                        onClick={(data) => {
                                            const statusKey = statusNameToKey[data?.name] || data?.name;
                                            if (statusKey) {
                                                router.push(`/dashboard/os/drilldown?type=status&value=${statusKey}`);
                                            }
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {analytics?.statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold text-[var(--text-primary)]">{totalCount}</span>
                                <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Total</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            {analytics?.statusData?.slice(0, 4).map((s) => (
                                <div
                                    key={s.name}
                                    className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                                    onClick={() => {
                                        const statusKey = statusNameToKey[s.name] || s.name;
                                        router.push(`/dashboard/os/drilldown?type=status&value=${statusKey}`);
                                    }}
                                >
                                    <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                                    <span className="text-xs text-[var(--text-secondary)] truncate">{s.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </PresentationSlide>

            {/* Slide 3: Recent Reports */}
            {reports.length > 0 && (
                <PresentationSlide
                    title="Laporan Terbaru"
                    subtitle="Laporan terakhir yang masuk"
                    icon={AlertCircle}
                >
                    <div className="space-y-3">
                        {reports.slice(0, 5).map((report) => (
                            <div
                                key={report.id}
                                onClick={() => setSelectedReport(report)}
                                className="flex items-center gap-4 p-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                    report.severity === 'high' || report.severity === 'urgent' ? "bg-red-100 text-red-600" :
                                    report.severity === 'medium' ? "bg-amber-100 text-amber-600" :
                                    "bg-emerald-100 text-emerald-600"
                                )}>
                                    <AlertCircle size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-[var(--text-primary)] truncate">{report.title}</p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {report.stations?.code} • {new Date(report.created_at).toLocaleDateString('id-ID')}
                                    </p>
                                </div>
                                <span
                                    className="px-2 py-1 rounded-full text-[10px] font-bold uppercase shrink-0"
                                    style={{
                                        color: STATUS_CONFIG[report.status as ReportStatus]?.color,
                                        backgroundColor: STATUS_CONFIG[report.status as ReportStatus]?.bgColor
                                    }}
                                >
                                    {STATUS_CONFIG[report.status as ReportStatus]?.label || report.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </PresentationSlide>
            )}

            {/* Report Detail Modal */}
            <ReportDetailModal
                isOpen={!!selectedReport}
                onClose={() => setSelectedReport(null)}
                report={selectedReport}
            />
        </div>
    );
}
