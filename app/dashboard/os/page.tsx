'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Clock, CheckCircle2, AlertCircle, FileText, RefreshCw, Loader2, Building2, 
    Activity, Globe, ArrowUpRight, Siren, Zap, Radio, Eye, TrendingUp,
    ShieldCheck, Target
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

import { STATUS_CONFIG, type ReportStatus } from '@/lib/constants/report-status';
import { NoiseTexture } from '@/components/ui/NoiseTexture';
import { cn } from '@/lib/utils';
import { Report } from '@/types';

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
    const [reports, setReports] = useState<Report[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [reportsRes, analyticsRes] = await Promise.all([
                fetch('/api/admin/reports'),
                fetch('/api/admin/analytics')
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
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 backdrop-blur-md p-3 border border-gray-200 rounded-xl shadow-xl">
                    <p className="text-xs font-bold text-gray-900 mb-1">{label}</p>
                    {payload.map((entry: any, idx: number) => (
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

    return (
        <div className="space-y-6 pb-24 stagger-children">
            {/* Hero Header - GREEN THEME */}
            <header className="relative overflow-hidden rounded-3xl p-8 lg:p-10 animate-fade-in-up bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600">
                <NoiseTexture />
                
                {/* Decorative circles */}
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-300/20 rounded-full blur-2xl" />
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30">
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                <span className="text-white text-xs font-bold uppercase tracking-wider">LIVE</span>
                            </span>
                            <span className="text-white/70 text-sm font-mono">
                                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white mb-2">
                            Dashboard Monitoring
                        </h1>
                        <p className="text-white/80 text-sm">
                            Monitoring real-time laporan untuk Divisi Operasional
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Link 
                            href="/dashboard/os/analytics"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all bg-emerald-700/50 hover:bg-emerald-700/70 text-white border border-white/20"
                        >
                            <TrendingUp size={16} />
                            Full Analytics
                        </Link>
                        <button 
                            onClick={fetchData}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all bg-white/20 hover:bg-white/30 text-white border border-white/30"
                        >
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Mini Stats Row */}
                <div className="relative z-10 grid grid-cols-2 lg:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/20">
                    <MiniStat icon={Globe} label="Total Laporan" value={totalCount} />
                    <MiniStat icon={Clock} label="Menunggu" value={pendingCount} highlight />
                    <MiniStat icon={CheckCircle2} label="Selesai" value={resolvedCount} />
                </div>
            </header>

            {/* Alert Banner */}
            {pendingCount > 5 && (
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 animate-fade-in-up">
                    <div className="p-2 bg-amber-100 rounded-xl">
                        <Siren size={20} className="text-amber-600 animate-pulse" />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-amber-800">Perhatian: {pendingCount} laporan menunggu</p>
                        <p className="text-sm text-amber-600">Beberapa laporan memerlukan tindakan segera</p>
                    </div>
                    <Link href="/dashboard/admin/reports" className="btn-secondary text-xs px-4 py-2">
                        Lihat Semua
                    </Link>
                </div>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <div className="card-solid lg:col-span-2 p-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-lg text-[var(--text-primary)]">Tren Laporan</h3>
                            <p className="text-xs text-[var(--text-muted)]">Volume per bulan</p>
                        </div>
                        <TrendingUp size={20} className="text-emerald-600" />
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics?.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                <div className="card-solid p-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
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
                            <div key={s.name} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                                <span className="text-xs text-[var(--text-secondary)] truncate">{s.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>


            {/* Recent Reports */}
            {reports.length > 0 && (
                <div className="card-solid p-6 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg text-[var(--text-primary)]">Laporan Terbaru</h3>
                        <Link 
                            href="/dashboard/admin/reports" 
                            className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                        >
                            Lihat Semua <ArrowUpRight size={12} />
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {reports.slice(0, 5).map((report) => (
                            <div 
                                key={report.id}
                                className="flex items-center gap-4 p-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
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
                </div>
            )}
        </div>
    );
}

function MiniStat({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string | number; highlight?: boolean }) {
    return (
        <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl", highlight ? "bg-white/30" : "bg-white/20")}>
                <Icon size={18} className="text-white" />
            </div>
            <div>
                <p className="text-white/70 text-[10px] uppercase tracking-wider font-medium">{label}</p>
                <p className={cn("text-white text-xl font-bold", highlight && "text-white")}>{value}</p>
            </div>
        </div>
    );
}
