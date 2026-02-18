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

const WrappedXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const label = String(payload.value);
    const words = label.split(/\s+/);
    const lines: string[] = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
        if ((currentLine + ' ' + words[i]).length < 15) {
            currentLine += ' ' + words[i];
        } else {
            lines.push(currentLine);
            currentLine = words[i];
        }
    }
    lines.push(currentLine);
    const displayLines = lines.slice(0, 3);
    if (lines.length > 3) displayLines[2] += '...';

    return (
        <g transform={`translate(${x},${y})`}>
            {displayLines.map((line, i) => (
                <text
                    key={i}
                    x={0}
                    y={0}
                    dy={16 + (i * 12)}
                    textAnchor="middle"
                    fill="#6b7280"
                    fontSize={10}
                >
                    {line}
                </text>
            ))}
        </g>
    );
};

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

    // Derived Data: Completion Status (Total vs Resolved)
    const completionStatusData = useMemo(() => {
        const total = safeTrendData.reduce((acc, curr) => acc + curr.total, 0);
        const resolved = safeTrendData.reduce((acc, curr) => acc + curr.resolved, 0);
        const pending = total - resolved;
        return [
            { name: 'Selesai', value: resolved, fill: '#10b981' },
            { name: 'Belum Selesai', value: pending, fill: '#cbd5e1' }
        ];
    }, [safeTrendData]);

    // Derived Data: Monthly Volume Distribution (Pie Chart)
    const monthlyVolumeData = useMemo(() => {
        return monthlyReportData.map((item, index) => ({
            name: item.month,
            value: item.irregularity + item.complaint + item.compliment,
            fill: COLORS[index % COLORS.length]
        })).filter(item => item.value > 0);
    }, [monthlyReportData]);

    return (
        <>
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
                        <div className="h-[180px] sm:h-[200px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPie>
                                    <Pie
                                        data={caseCategoryData as CaseCategoryItem[]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={75}
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
                                <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                                    {(caseCategoryData as CaseCategoryItem[]).reduce((sum, d) => sum + d.value, 0)}
                                </span>
                                <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Total</span>
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

                    {/* Completion Status (Donut) */}
                    <div className="card-solid p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Status Penyelesaian</h3>
                                <p className="text-xs text-[var(--text-muted)]">Total vs Selesai</p>
                            </div>
                        </div>
                        <div className="h-[180px] sm:h-[200px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPie>
                                    <Pie
                                        data={completionStatusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={75}
                                        paddingAngle={3}
                                        dataKey="value"
                                        cornerRadius={4}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {completionStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </RechartsPie>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                                    {completionStatusData.reduce((sum, d) => sum + d.value, 0)}
                                </span>
                                <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Total</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-3 mt-2">
                             {completionStatusData.map((s) => (
                                <div key={s.name} className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.fill }} />
                                    <span className="text-[10px] text-[var(--text-secondary)]">{s.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>



                    {/* Monthly Volume Distribution (Pie) */}
                    <div className="card-solid p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Volume per Bulan</h3>
                                <p className="text-xs text-[var(--text-muted)]">Distribusi laporan bulanan</p>
                            </div>
                        </div>
                        <div className="h-[180px] sm:h-[200px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPie>
                                    <Pie
                                        data={monthlyVolumeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={75}
                                        paddingAngle={3}
                                        dataKey="value"
                                        cornerRadius={4}
                                        style={{ cursor: 'pointer' }}
                                        onClick={(data) => {
                                            if (data?.name) onDrilldown(drilldownUrl('month', data.name));
                                        }}
                                    >
                                        {monthlyVolumeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </RechartsPie>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                                    {monthlyVolumeData.reduce((sum, d) => sum + d.value, 0)}
                                </span>
                                <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Total</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-3 mt-2">
                             {monthlyVolumeData.map((s) => (
                                <div key={s.name} className="flex items-center gap-1.5 cursor-pointer" onClick={() => onDrilldown(drilldownUrl('month', s.name))}>
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.fill }} />
                                    <span className="text-[10px] text-[var(--text-secondary)]">{s.name}</span>
                                </div>
                            ))}
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
                        <div className="h-[260px] sm:h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={areaSubCategoryData as any[]}
                                    margin={{ top: 25, right: 10, left: -20, bottom: 5 }}
                                    barCategoryGap="30%"
                                    onClick={(state) => {
                                        if (state?.activeLabel) onDrilldown(drilldownUrl('area', String(state.activeLabel)));
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-4)" opacity={0.5} />
                                    <XAxis dataKey="area" tick={<WrappedXAxisTick />} axisLine={false} tickLine={false} height={80} interval={0} />
                                    <YAxis tick={{fill: 'var(--text-secondary)', fontSize: 10}} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    {allSubCategories.map((cat, idx) => (
                                        <Bar 
                                            key={cat} 
                                            dataKey={cat} 
                                            name={cat} 
                                            fill={COLORS[idx % COLORS.length]} 
                                            radius={[4, 4, 0, 0]}
                                            barSize={12}
                                        >
                                            <LabelList 
                                                dataKey={cat} 
                                                position="top" 
                                                fill="var(--text-secondary)" 
                                                fontSize={9} 
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
                        <div className="h-[250px] sm:h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={branchReportData as BranchReportItem[]} margin={{ top: 10, right: 10, left: -25, bottom: 10 }} barCategoryGap="30%">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--surface-4)" />
                                    <XAxis dataKey="station" tick={<WrappedXAxisTick />} axisLine={false} tickLine={false} interval={0} height={80} />
                                    <YAxis tick={{fill: 'var(--text-secondary)', fontSize: 10}} axisLine={false} tickLine={false} />
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
                                        barSize={20}
                                    >
                                        <LabelList dataKey="count" position="top" fill="var(--text-secondary)" fontSize={9} />
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
                        <div className="h-[280px] sm:h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={airlinesTotalData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }} barCategoryGap="30%">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--surface-4)" />
                                    <XAxis dataKey="airline" tick={<WrappedXAxisTick />} axisLine={false} tickLine={false} interval={0} height={80} />
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
                                        barSize={20}
                                    >
                                        <LabelList dataKey="total" position="top" fill="var(--text-secondary)" fontSize={9} />
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
                                    barCategoryGap="30%"
                                    onClick={(state) => {
                                        if (state?.activeLabel) onDrilldown(drilldownUrl('airline', String(state.activeLabel)));
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--surface-4)" />
                                    <XAxis dataKey="airline" tick={<WrappedXAxisTick />} axisLine={false} tickLine={false} height={80} interval={0} />
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
