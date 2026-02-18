'use client';

import { useMemo } from 'react';

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart as RechartsPie, Pie, Cell, BarChart, Bar,
    ComposedChart, LabelList, Line
} from 'recharts';
import {
    TrendingUp, PieChart as PieChartIcon, Building2,
    Target, Users, Activity, CalendarDays, MapPin
} from 'lucide-react';
import { BarChart3 } from 'lucide-react';
import { STATUS_CONFIG, type ReportStatus } from '@/lib/constants/report-status';
import { PresentationSlide } from '@/components/dashboard/PresentationSlide';
import type { Report } from '@/types';

// Complexity: Time O(n) per render | Space O(k) where k = chart data points (pre-computed by parent)

interface CaseCategoryItem {
    name: string;
    value: number;
    fill: string;
}

interface BranchReportItem {
    station: string;
    count: number;
}

interface MonthlyReportItem {
    month: string;
    irregularity: number;
    complaint: number;
    compliment: number;
}

interface CategoryByAreaItem {
    name: string;
    value: number;
    fill: string;
}

interface CategoryByBranchItem {
    branch: string;
    irregularity: number;
    complaint: number;
    compliment: number;
}

interface CategoryByAirlinesItem {
    airline: string;
    irregularity: number;
    complaint: number;
    compliment: number;
}

interface TopReporterItem {
    name: string;
    station: string;
    count: number;
}

interface MonthlyComparisonItem {
    month: string;
    masuk: number;
    selesai: number;
    rate: number;
}

interface HubDistributionItem {
    hub: string;
    count: number;
}

interface ResolutionByBranchItem {
    branch: string;
    total: number;
    resolved: number;
    rate: number;
}

interface AreaSubCategoryItem {
    area: string;
    [key: string]: string | number;
}

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

export interface AnalystChartsProps {
    readonly analytics: AnalyticsData | null;
    readonly caseCategoryData: readonly CaseCategoryItem[];
    readonly branchReportData: readonly BranchReportItem[];
    readonly monthlyReportData: readonly MonthlyReportItem[];
    readonly categoryByAreaData: readonly CategoryByAreaItem[];
    readonly categoryByBranchData: readonly CategoryByBranchItem[];
    readonly areaSubCategoryData: readonly AreaSubCategoryItem[];
    readonly categoryByAirlinesData: readonly CategoryByAirlinesItem[];
    readonly topReportersData: readonly TopReporterItem[];
    readonly monthlyComparisonData: readonly MonthlyComparisonItem[];
    readonly hubDistributionData: readonly HubDistributionItem[];
    readonly resolutionByBranchData: readonly ResolutionByBranchItem[];
    readonly filteredReports: readonly Report[];
    readonly onDrilldown: (url: string) => void;
    readonly drilldownUrl: (type: string, value: string) => string;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        name?: string;
        value?: number;
        color?: string;
        fill?: string;
        dataKey?: string;
        payload?: Record<string, unknown>;
    }>;
    label?: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;

    const isPieChart = !label && (payload[0]?.payload?.name || payload[0]?.payload?.division);

    if (isPieChart) {
        const data = payload[0];
        const displayName = (data.name || data.payload?.name || data.payload?.division || data.payload?.category || 'Unknown') as string;
        const displayValue = data.value;
        const color = data.fill || data.color || '#10b981';

        return (
            <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-2xl min-w-[140px]">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                    <p className="text-sm font-bold text-gray-900">{displayName}</p>
                </div>
                <p className="text-2xl font-bold" style={{ color }}>{displayValue as number}</p>
                <p className="text-xs text-gray-500">laporan</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-2xl min-w-[160px]">
            <p className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">{label}</p>
            <div className="space-y-2">
                {payload.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color || entry.fill }} />
                            <span className="text-xs text-gray-600">{entry.name}</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: entry.color || entry.fill }}>
                            {entry.value}{entry.name?.includes('%') || entry.dataKey === 'rate' ? '%' : ''}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function AnalystCharts({
    analytics,
    caseCategoryData,
    branchReportData,
    monthlyReportData,
    categoryByAreaData,
    categoryByBranchData,
    areaSubCategoryData,
    categoryByAirlinesData,
    topReportersData,
    monthlyComparisonData,
    hubDistributionData,
    resolutionByBranchData,
    filteredReports,
    onDrilldown,
    drilldownUrl,
}: AnalystChartsProps) {
    // Extract unique sub-categories for stacked bar chart
    const allSubCategories = useMemo(() => {
        const cats = new Set<string>();
        areaSubCategoryData.forEach(item => {
            Object.keys(item).forEach(key => {
                if (key !== 'area' && typeof item[key] === 'number') cats.add(key);
            });
        });
        return Array.from(cats);
    }, [areaSubCategoryData]);
    // Derived Data: Airlines Total (Sum of categories)
    const airlinesTotalData = useMemo(() => {
        return categoryByAirlinesData.map(item => ({
            airline: item.airline,
            total: item.irregularity + item.complaint + item.compliment
        })).sort((a, b) => b.total - a.total);
    }, [categoryByAirlinesData]);

    // Derived Data: Safe Trend Data (Fallback if analytics.trendData is missing)
    const safeTrendData = useMemo(() => {
        if (analytics?.trendData?.length) return analytics.trendData;
        
        // Fallback: Use monthlyComparisonData which matches { month, total: masuk, resolved: selesai }
        if (monthlyComparisonData.length > 0) {
            return monthlyComparisonData.map(item => ({
                month: item.month,
                total: item.masuk,
                resolved: item.selesai
            }));
        }

        // Last resort: Map monthlyReportData
        return monthlyReportData.map(item => ({
            month: item.month,
            total: item.irregularity + item.complaint + item.compliment,
            resolved: 0
        }));
    }, [analytics?.trendData, monthlyComparisonData, monthlyReportData]);

    return (
        <>
            {/* Slide 1: Monthly Analytics (grouped side-by-side) */}
            <PresentationSlide
                title="Analisis Bulanan"
                subtitle="Tren laporan dan perbandingan performa bulanan"
                icon={CalendarDays}
                hint="Klik chart untuk melihat detail laporan per bulan"
            >
                <div className="flex flex-col gap-6">
                    {/* Monthly Report (Horizontal Stacked Bar) */}
                    <div className="card-solid p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Monthly Report</h3>
                                <p className="text-xs text-[var(--text-muted)]">Tren bulanan</p>
                            </div>
                            <CalendarDays size={20} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="flex justify-end gap-4 mb-3">
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" /><span className="text-[10px] text-[var(--text-muted)]">Irregularity</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" /><span className="text-[10px] text-[var(--text-muted)]">Irregularity</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#f43f5e]" /><span className="text-[10px] text-[var(--text-muted)]">Complaint</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#0ea5e9]" /><span className="text-[10px] text-[var(--text-muted)]">Compliment</span></div>
                        </div>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={monthlyReportData as MonthlyReportItem[]}
                                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                                    onClick={(state) => {
                                        const s = state as { activeLabel?: string };
                                        if (s?.activeLabel) onDrilldown(drilldownUrl('month', String(s.activeLabel)));
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-4)" opacity={0.5} />
                                    <XAxis dataKey="month" tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="irregularity" name="Irregularity" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32}>
                                        <LabelList dataKey="irregularity" position="top" fill="var(--text-secondary)" fontSize={10} formatter={(v: any) => v > 0 ? v : ''} />
                                    </Bar>
                                    <Bar dataKey="complaint" name="Complaint" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={32}>
                                        <LabelList dataKey="complaint" position="top" fill="var(--text-secondary)" fontSize={10} formatter={(v: any) => v > 0 ? v : ''} />
                                    </Bar>
                                    <Bar dataKey="compliment" name="Compliment" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={32}>
                                        <LabelList dataKey="compliment" position="top" fill="var(--text-secondary)" fontSize={10} formatter={(v: any) => v > 0 ? v : ''} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Monthly Comparison (Redesigned) */}
                    <div className="card-solid p-6">
                        {/* Header with Insights */}
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Perbandingan Bulanan</h3>
                                <p className="text-xs text-[var(--text-muted)]">Volume Masuk vs Selesai & Completion Rate</p>
                            </div>
                            
                            {/* YTD Summary Stats */}
                            <div className="flex items-center gap-4 bg-[var(--surface-2)] p-2 rounded-xl border border-[var(--surface-4)]">
                                <div className="px-3 border-r border-[var(--surface-4)]">
                                    <p className="text-[10px] uppercase text-[var(--text-muted)] font-bold">Total Masuk</p>
                                    <p className="text-lg font-bold text-[var(--text-primary)]">
                                        {monthlyComparisonData.reduce((acc, curr) => acc + curr.masuk, 0).toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <div className="px-3 border-r border-[var(--surface-4)]">
                                    <p className="text-[10px] uppercase text-[var(--text-muted)] font-bold">Total Selesai</p>
                                    <p className="text-lg font-bold text-[#10b981]">
                                        {monthlyComparisonData.reduce((acc, curr) => acc + curr.selesai, 0).toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <div className="px-3">
                                    <p className="text-[10px] uppercase text-[var(--text-muted)] font-bold">Avg Rate</p>
                                    <p className="text-lg font-bold text-[#3b82f6]">
                                        {monthlyComparisonData.length > 0
                                            ? Math.round((monthlyComparisonData.reduce((acc, curr) => acc + curr.selesai, 0) / monthlyComparisonData.reduce((acc, curr) => acc + curr.masuk, 0)) * 100)
                                            : 0}%
                                    </p>
                                </div>
                            </div>
                        </div>

                        {monthlyComparisonData.length === 0 ? (
                            <p className="text-sm text-[var(--text-muted)] text-center py-12">Belum ada data perbandingan bulanan</p>
                        ) : (
                            <>
                                <div className="h-[320px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart
                                            data={monthlyComparisonData as MonthlyComparisonItem[]}
                                            margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
                                            onClick={(state) => {
                                                if (state?.activeLabel) onDrilldown(drilldownUrl('month', String(state.activeLabel)));
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-4)" opacity={0.5} />
                                            <XAxis 
                                                dataKey="month" 
                                                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                                                axisLine={false} 
                                                tickLine={false} 
                                                dy={10}
                                            />
                                            {/* Primary Axis (Volume) */}
                                            <YAxis 
                                                yAxisId="left" 
                                                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
                                                axisLine={false} 
                                                tickLine={false} 
                                            />
                                            {/* Secondary Axis (Rate) - Hidden but functional */}
                                            <YAxis 
                                                yAxisId="right" 
                                                orientation="right" 
                                                domain={[0, 100]} 
                                                hide={true} 
                                            />
                                            
                                            <Tooltip 
                                                cursor={{ fill: 'var(--surface-2)', opacity: 0.4 }}
                                                content={({ active, payload, label }) => {
                                                    if (!active || !payload?.length) return null;
                                                    const masuk = payload.find(p => p.name === 'Masuk')?.value as number || 0;
                                                    const selesai = payload.find(p => p.name === 'Selesai')?.value as number || 0;
                                                    const rate = payload.find(p => p.name === 'Rate %')?.value as number || 0;
                                                    const gap = masuk - selesai;

                                                    return (
                                                        <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-2xl min-w-[200px]">
                                                            <p className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">{label}</p>
                                                            <div className="space-y-3">
                                                                <div className="flex justify-between items-center">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2.5 h-2.5 rounded-sm bg-[#cbd5e1]" />
                                                                        <span className="text-xs text-gray-600">Masuk</span>
                                                                    </div>
                                                                    <span className="text-sm font-bold text-gray-900">{masuk}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />
                                                                        <span className="text-xs text-gray-600">Selesai</span>
                                                                    </div>
                                                                    <span className="text-sm font-bold text-[#10b981]">{selesai}</span>
                                                                </div>
                                                                <div className="pt-2 border-t border-gray-50 flex justify-between items-center">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                                                                        <span className="text-xs text-gray-600">Completion</span>
                                                                    </div>
                                                                    <span className="text-sm font-bold text-[#3b82f6]">{rate}%</span>
                                                                </div>
                                                                {gap > 0 && (
                                                                    <div className="flex justify-between items-center pt-1">
                                                                         <span className="text-[10px] text-red-500 font-medium">Gap (Pending)</span>
                                                                         <span className="text-xs font-bold text-red-500">+{gap}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            />

                                            {/* Bars */}
                                            <Bar 
                                                yAxisId="left" 
                                                dataKey="masuk" 
                                                name="Masuk" 
                                                fill="#cbd5e1" 
                                                radius={[4, 4, 0, 0]} 
                                                barSize={32}
                                            />
                                            <Bar 
                                                yAxisId="left" 
                                                dataKey="selesai" 
                                                name="Selesai" 
                                                fill="#10b981" 
                                                radius={[4, 4, 0, 0]} 
                                                barSize={32}
                                            />

                                            
                                            {/* Line Overlay */}
                                            <Line 
                                                yAxisId="right" 
                                                type="monotone" 
                                                dataKey="rate" 
                                                name="Rate %" 
                                                stroke="#3b82f6" 
                                                strokeWidth={2} 
                                                dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }} 
                                                activeDot={{ r: 5, strokeWidth: 0 }}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-center gap-6 mt-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded" style={{ background: '#cbd5e1' }} />
                                        <span className="text-xs text-[var(--text-muted)]">Masuk (Volume)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded" style={{ background: '#10b981' }} />
                                        <span className="text-xs text-[var(--text-muted)]">Selesai (Resolved)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-1.5 rounded-full" style={{ background: '#3b82f6' }} />
                                        <span className="text-xs text-[var(--text-muted)]">Completion Rate %</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </PresentationSlide>

            {/* Slide 2: General Categories & Volume Trends */}
            <PresentationSlide
                title="Tren & Distribusi Kategori"
                subtitle="Volume laporan dan proporsi kategori"
                icon={PieChartIcon}
                hint="Klik segmen untuk filter berdasarkan kategori"
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Case Category (Donut) - Col 1 */}
                    <div className="card-solid p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Kategori Kasus</h3>
                                <p className="text-xs text-[var(--text-muted)]">Proporsi Tipe Laporan</p>
                            </div>
                        </div>
                        <div className="h-[200px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPie>
                                    <Pie
                                        data={caseCategoryData as CaseCategoryItem[]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={3}
                                        dataKey="value"
                                        cornerRadius={4}
                                        onClick={(data) => {
                                            if (data?.name) onDrilldown(drilldownUrl('category', data.name));
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {(caseCategoryData as CaseCategoryItem[]).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </RechartsPie>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold text-[var(--text-primary)]">
                                    {(caseCategoryData as CaseCategoryItem[]).reduce((sum, d) => sum + d.value, 0)}
                                </span>
                                <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Total</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-3 mt-2">
                             {(caseCategoryData as CaseCategoryItem[]).map((s) => (
                                <div key={s.name} className="flex items-center gap-1.5 cursor-pointer" onClick={() => onDrilldown(drilldownUrl('category', s.name))}>
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.fill }} />
                                    <span className="text-[10px] text-[var(--text-secondary)]">{s.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Trend Volume (Area) - Col 2 (Span 2) */}
                    <div className="card-solid lg:col-span-2 p-6">
                         <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Tren Volume</h3>
                                <p className="text-xs text-[var(--text-muted)]">Pergerakan total kasus</p>
                            </div>
                        </div>
                        <div className="h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={safeTrendData}
                                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                    onClick={(state) => {
                                        const s = state as { activeLabel?: string; activePayload?: Array<{ payload?: { month?: string } }> };
                                        const label = s?.activeLabel || (s?.activePayload?.[0]?.payload?.month);
                                        if (label) onDrilldown(drilldownUrl('month', String(label)));
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-4)" />
                                    <XAxis dataKey="month" tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="total" name="Total" stroke="var(--brand-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                                    <Area type="monotone" dataKey="resolved" name="Selesai" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorResolved)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Summary by Area (Full Width) */}
                    <div className="card-solid lg:col-span-3 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Summary by Area</h3>
                                <p className="text-xs text-[var(--text-muted)]">Distribusi laporan per wilayah kerja</p>
                            </div>
                            <MapPin size={20} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={categoryByAreaData}
                                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                                    onClick={(state) => {
                                        if (state?.activeLabel) onDrilldown(drilldownUrl('area', String(state.activeLabel)));
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-4)" opacity={0.5} />
                                    <XAxis dataKey="name" tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" name="Laporan" radius={[4, 4, 0, 0]} barSize={40}>
                                        {(categoryByAreaData as any[]).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                                        ))}
                                        <LabelList dataKey="value" position="top" fill="var(--text-secondary)" fontSize={10} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Area and Sub-Category Breakdown (Full Width) */}
                    <div className="card-solid lg:col-span-3 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Area and Sub-Category Breakdown</h3>
                                <p className="text-xs text-[var(--text-muted)]">Detail kategori per wilayah</p>
                            </div>
                            <Activity size={20} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={areaSubCategoryData as any[]}
                                    margin={{ top: 25, right: 30, left: 0, bottom: 5 }}
                                    onClick={(state) => {
                                        if (state?.activeLabel) onDrilldown(drilldownUrl('area', String(state.activeLabel)));
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-4)" opacity={0.5} />
                                    <XAxis dataKey="area" tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    {allSubCategories.map((cat, idx) => (
                                        <Bar 
                                            key={cat} 
                                            dataKey={cat} 
                                            name={cat} 
                                            fill={COLORS[idx % COLORS.length]} 
                                            radius={[4, 4, 0, 0]}
                                            barSize={16}
                                        >
                                            <LabelList 
                                                dataKey={cat} 
                                                position="top" 
                                                fill="var(--text-secondary)" 
                                                fontSize={10} 
                                                formatter={(v: any) => v > 0 ? v : ''}
                                            />
                                        </Bar>
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap justify-center gap-3 mt-4">
                            {allSubCategories.map((cat, idx) => (
                                <div key={cat} className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[idx % COLORS.length] }} />
                                    <span className="text-[10px] text-[var(--text-secondary)]">{cat}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </PresentationSlide>

            {/* Slide 3: Station Analysis (Total & Category Breakdown) */}
            <PresentationSlide
                title="Analisis Stasiun"
                subtitle="Performa dan kategori laporan per cabang"
                icon={Building2}
                hint="Klik bar untuk filter per stasiun"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Branch Report (Total - Simple Bar) */}
                    <div className="card-solid p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Total Laporan per Stasiun</h3>
                                <p className="text-xs text-[var(--text-muted)]">Top 10 Stasiun dengan volume tertinggi</p>
                            </div>
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={branchReportData as BranchReportItem[]} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--surface-4)" />
                                    <XAxis dataKey="station" tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="count"
                                        name="Laporan"
                                        fill="#10b981"
                                        radius={[4, 4, 0, 0]}
                                        onClick={(data) => {
                                            const d = data as { station?: string };
                                            if (d?.station) onDrilldown(drilldownUrl('station', d.station));
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <LabelList dataKey="count" position="top" fill="var(--text-secondary)" fontSize={10} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Category by Branch (Stacked Horizontal) */}
                    <div className="card-solid p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Kategori per Stasiun</h3>
                                <p className="text-xs text-[var(--text-muted)]">Breakdown tipe laporan</p>
                            </div>
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={categoryByBranchData as CategoryByBranchItem[]}
                                    layout="vertical"
                                    margin={{ left: 30, right: 10 }}
                                    onClick={(state) => {
                                        if (state?.activeLabel) onDrilldown(drilldownUrl('station', String(state.activeLabel)));
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="var(--surface-4)" />
                                    <XAxis type="number" tick={{fill: 'var(--text-secondary)', fontSize: 10}} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="branch" tick={{fill: 'var(--text-secondary)', fontSize: 10}} axisLine={false} tickLine={false} width={35} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="irregularity" name="Irregularity" stackId="a" fill="#10b981" radius={0} />
                                    <Bar dataKey="complaint" name="Complaint" stackId="a" fill="#ec4899" radius={0} />
                                    <Bar dataKey="compliment" name="Compliment" stackId="a" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </PresentationSlide>

            {/* Slide 4: Airline Analysis (Total & Category Breakdown) */}
            <PresentationSlide
                title="Analisis Maskapai"
                subtitle="Volume dan kategori laporan berdasarkan maskapai"
                icon={TrendingUp}
                hint="Klik chart untuk filter per maskapai"
            >
                <div className="grid grid-cols-1 gap-6">
                    {/* Airlines Total (Derived) */}
                    <div className="card-solid p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Total Laporan Maskapai</h3>
                                <p className="text-xs text-[var(--text-muted)]">Top Maskapai dengan laporan terbanyak</p>
                            </div>
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={airlinesTotalData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--surface-4)" />
                                    <XAxis dataKey="airline" tick={{fill: 'var(--text-secondary)', fontSize: 9}} axisLine={false} tickLine={false} interval={0} height={60} />
                                    <YAxis tick={{fill: 'var(--text-secondary)', fontSize: 10}} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="total"
                                        name="Total"
                                        fill="#3b82f6"
                                        radius={[4, 4, 0, 0]}
                                        onClick={(data) => {
                                            const d = data as { airline?: string };
                                            if (d?.airline) onDrilldown(drilldownUrl('airline', d.airline));
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <LabelList dataKey="total" position="top" fill="var(--text-secondary)" fontSize={10} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Category by Airline (Grouped Bar) */}
                    <div className="card-solid p-6">
                         <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Kategori per Maskapai</h3>
                                <p className="text-xs text-[var(--text-muted)]">Breakdown tipe laporan</p>
                            </div>
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={categoryByAirlinesData as CategoryByAirlinesItem[]}
                                    margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                                    onClick={(state) => {
                                        if (state?.activeLabel) onDrilldown(drilldownUrl('airline', String(state.activeLabel)));
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--surface-4)" />
                                    <XAxis dataKey="airline" tick={{fill: 'var(--text-secondary)', fontSize: 9}} axisLine={false} tickLine={false} height={60} interval={0} />
                                    <YAxis tick={{fill: 'var(--text-secondary)', fontSize: 10}} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="irregularity" name="Irregularity" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="complaint" name="Complaint" fill="#ec4899" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="compliment" name="Compliment" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </PresentationSlide>

            {/* Slide 5: Additional Insights (Top Reporters & Status Flow) */}
            <PresentationSlide
                title="Wawasan Tambahan"
                subtitle="Kontributor dan Alur Status"
                icon={Activity}
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     {/* Top Reporters — real data */}
                    <div className="card-solid p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Top Pelapor</h3>
                                <p className="text-xs text-[var(--text-muted)]">Kontributor terbanyak</p>
                            </div>
                            <Users size={20} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {topReportersData.length === 0 ? (
                                <p className="text-sm text-[var(--text-muted)] text-center py-8">Belum ada data pelapor</p>
                            ) : (
                                (topReportersData as TopReporterItem[]).map((reporter, idx) => (
                                    <div key={reporter.name} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                            style={{ background: COLORS[idx % COLORS.length] }}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{reporter.name}</p>
                                            <p className="text-[10px] text-[var(--text-muted)]">{reporter.station}</p>
                                        </div>
                                        <span className="text-sm font-bold shrink-0" style={{ color: COLORS[idx % COLORS.length] }}>{reporter.count}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Status Flow */}
                    <div className="card-solid p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Alur Status</h3>
                                <p className="text-xs text-[var(--text-muted)]">Distribusi status laporan</p>
                            </div>
                            <Activity size={20} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="space-y-3">
                            {[
                                { status: 'MENUNGGU_FEEDBACK', label: 'Menunggu Feedback', count: filteredReports.filter(r => r.status === 'MENUNGGU_FEEDBACK').length },
                                { status: 'SUDAH_DIVERIFIKASI', label: 'Sudah Diverifikasi', count: filteredReports.filter(r => r.status === 'SUDAH_DIVERIFIKASI').length },
                                { status: 'SELESAI', label: 'Selesai', count: filteredReports.filter(r => r.status === 'SELESAI').length },
                            ].map((item) => {
                                const cfg = STATUS_CONFIG[item.status as ReportStatus];
                                const maxCount = Math.max(filteredReports.length, 1);
                                const percentage = Math.round((item.count / maxCount) * 100);
                                return (
                                    <div
                                        key={item.status}
                                        className="cursor-pointer hover:bg-[var(--surface-2)] rounded-lg p-2 -mx-2 transition-colors"
                                        onClick={() => onDrilldown(drilldownUrl('status', item.status))}
                                    >
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium" style={{ color: cfg?.color }}>{item.label}</span>
                                            <span className="font-bold text-[var(--text-primary)]">{item.count}</span>
                                        </div>
                                        <div className="h-2 bg-[var(--surface-3)] rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${Math.max(percentage, 5)}%`, background: cfg?.color }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </PresentationSlide>
        </>
    );
}
