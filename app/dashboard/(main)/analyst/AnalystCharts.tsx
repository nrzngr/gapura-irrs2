'use client';

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart as RechartsPie, Pie, Cell, BarChart, Bar,
    ComposedChart, LabelList, Line
} from 'recharts';
import {
    TrendingUp, PieChart as PieChartIcon, Building2,
    Target, Users, Activity, CalendarDays
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
    readonly categoryByAirlinesData: readonly CategoryByAirlinesItem[];
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
    categoryByAirlinesData,
    filteredReports,
    onDrilldown,
    drilldownUrl,
}: AnalystChartsProps) {
    return (
        <>
            {/* Slide 2: Trend Area Chart + Case Category Donut */}
            <PresentationSlide
                title="Tren & Kategori"
                subtitle="Volume laporan dan distribusi kategori"
                icon={TrendingUp}
                hint="Klik chart untuk melihat detail laporan"
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Trend Chart */}
                    <div className="card-solid lg:col-span-2 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Tren Volume Laporan</h3>
                                <p className="text-xs text-[var(--text-muted)]">Total vs Terselesaikan</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-[var(--brand-primary)]" />
                                    <span className="text-xs text-[var(--text-muted)]">Total</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    <span className="text-xs text-[var(--text-muted)]">Selesai</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={analytics?.trendData?.length ? analytics.trendData : monthlyReportData as unknown as Array<{ month: string; total: number; resolved: number }>}
                                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                    onClick={(state) => {
                                        const s = state as { activeLabel?: string; activePayload?: Array<{ payload?: { month?: string } }> };
                                        const label = s?.activeLabel || (s?.activePayload?.[0]?.payload?.month);
                                        if (label) {
                                            onDrilldown(drilldownUrl('month', String(label)));
                                        }
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

                    {/* Case Category Report (Donut) */}
                    <div className="card-solid p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Case Category Report</h3>
                                <p className="text-xs text-[var(--text-muted)]">Irregularity / Complaint / Compliment</p>
                            </div>
                            <PieChartIcon size={20} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="h-[220px] relative">
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
                        <div className="flex justify-center gap-6 mt-2">
                            {(caseCategoryData as CaseCategoryItem[]).map((s) => (
                                <div
                                    key={s.name}
                                    className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                                    onClick={() => onDrilldown(drilldownUrl('category', s.name))}
                                >
                                    <div className="w-3 h-3 rounded-full" style={{ background: s.fill }} />
                                    <span className="text-xs text-[var(--text-secondary)]">{s.name} ({s.value})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </PresentationSlide>

            {/* Slide 3: Branch Report + Monthly Report */}
            <PresentationSlide
                title="Laporan per Stasiun & Bulanan"
                subtitle="Distribusi laporan berdasarkan stasiun dan tren bulanan"
                icon={Building2}
                hint="Klik bar untuk melihat detail laporan"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Branch Report (Vertical Bar) */}
                    <div className="card-solid p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Branch Report</h3>
                                <p className="text-xs text-[var(--text-muted)]">Laporan per stasiun</p>
                            </div>
                            <Building2 size={20} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="h-[280px]">
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
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#ec4899]" /><span className="text-[10px] text-[var(--text-muted)]">Complaint</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#06b6d4]" /><span className="text-[10px] text-[var(--text-muted)]">Compliment</span></div>
                        </div>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={monthlyReportData as MonthlyReportItem[]}
                                    layout="vertical"
                                    margin={{ left: 30, right: 10 }}
                                    onClick={(state) => {
                                        const s = state as { activeLabel?: string };
                                        if (s?.activeLabel) onDrilldown(drilldownUrl('month', String(s.activeLabel)));
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="var(--surface-4)" />
                                    <XAxis type="number" tick={{fill: 'var(--text-secondary)', fontSize: 10}} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="month" tick={{fill: 'var(--text-secondary)', fontSize: 10}} axisLine={false} tickLine={false} width={35} />
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

            {/* Slide 4: Category by Area + Category by Branch */}
            <PresentationSlide
                title="Kategori per Area & Stasiun"
                subtitle="Distribusi kategori berdasarkan area dan stasiun"
                icon={Target}
                hint="Klik chart untuk melihat detail laporan"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Category by Area (Donut) */}
                    <div className="card-solid p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Category by Area</h3>
                                <p className="text-xs text-[var(--text-muted)]">Distribusi per area</p>
                            </div>
                            <Target size={20} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="h-[200px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPie>
                                    <Pie
                                        data={categoryByAreaData as CategoryByAreaItem[]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                        cornerRadius={4}
                                        onClick={(data) => {
                                            if (data?.name) onDrilldown(drilldownUrl('area', data.name));
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {(categoryByAreaData as CategoryByAreaItem[]).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </RechartsPie>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-xl font-bold text-[var(--text-primary)]">
                                    {(categoryByAreaData as CategoryByAreaItem[]).reduce((sum, d) => sum + d.value, 0)}
                                </span>
                                <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Total</span>
                            </div>
                        </div>
                        <div className="flex justify-center gap-4 mt-2">
                            {(categoryByAreaData as CategoryByAreaItem[]).map((d) => (
                                <div
                                    key={d.name}
                                    className="flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity"
                                    onClick={() => onDrilldown(drilldownUrl('area', d.name))}
                                >
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                                    <span className="text-[10px] text-[var(--text-secondary)]">{d.name} ({d.value})</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Category by Branch (Horizontal Stacked Bar) */}
                    <div className="card-solid p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Category By Branch</h3>
                                <p className="text-xs text-[var(--text-muted)]">Per stasiun</p>
                            </div>
                            <BarChart3 size={20} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="flex justify-end gap-4 mb-3">
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" /><span className="text-[10px] text-[var(--text-muted)]">Irregularity</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#ec4899]" /><span className="text-[10px] text-[var(--text-muted)]">Complaint</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#06b6d4]" /><span className="text-[10px] text-[var(--text-muted)]">Compliment</span></div>
                        </div>
                        <div className="h-[240px]">
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

            {/* Slide 5: Airlines Chart */}
            <PresentationSlide
                title="Kategori per Maskapai"
                subtitle="Distribusi laporan berdasarkan maskapai penerbangan"
                icon={TrendingUp}
                hint="Klik bar untuk melihat detail laporan"
            >
                <div className="card-solid p-6">
                    <div className="flex justify-end gap-4 mb-3">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" /><span className="text-[10px] text-[var(--text-muted)]">Irregularity</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#ec4899]" /><span className="text-[10px] text-[var(--text-muted)]">Complaint</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#06b6d4]" /><span className="text-[10px] text-[var(--text-muted)]">Compliment</span></div>
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
                                <Bar dataKey="irregularity" name="Irregularity" fill="#10b981" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="irregularity" position="top" fill="var(--text-secondary)" fontSize={9} />
                                </Bar>
                                <Bar dataKey="complaint" name="Complaint" fill="#ec4899" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="complaint" position="top" fill="var(--text-secondary)" fontSize={9} />
                                </Bar>
                                <Bar dataKey="compliment" name="Compliment" fill="#06b6d4" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="compliment" position="top" fill="var(--text-secondary)" fontSize={9} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </PresentationSlide>

            {/* Slide 6: Top Reporters + Status Flow */}
            <PresentationSlide
                title="Pelapor & Status"
                subtitle="Kontributor terbanyak dan alur status laporan"
                icon={Users}
                hint="Klik status untuk melihat detail laporan"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Reporters */}
                    <div className="card-solid p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Top Pelapor</h3>
                                <p className="text-xs text-[var(--text-muted)]">Kontributor terbanyak</p>
                            </div>
                            <Users size={20} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="space-y-3">
                            {[
                                { name: 'Ahmad Ridwan', count: 24, station: 'CGK' },
                                { name: 'Siti Nurhaliza', count: 18, station: 'SUB' },
                                { name: 'Budi Santoso', count: 15, station: 'DPS' },
                                { name: 'Dewi Lestari', count: 12, station: 'CGK' },
                                { name: 'Eko Prasetyo', count: 9, station: 'JOG' },
                            ].map((reporter, idx) => (
                                <div key={reporter.name} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                        style={{ background: COLORS[idx % COLORS.length] }}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{reporter.name}</p>
                                        <p className="text-[10px] text-[var(--text-muted)]">{reporter.station}</p>
                                    </div>
                                    <span className="text-sm font-bold" style={{ color: COLORS[idx % COLORS.length] }}>{reporter.count}</span>
                                </div>
                            ))}
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

            {/* Slide 7: Monthly Comparison */}
            <PresentationSlide
                title="Perbandingan Bulanan"
                subtitle="Masuk vs Selesai per bulan"
                icon={TrendingUp}
                hint="Klik bar untuk melihat detail laporan"
            >
                <div className="card-solid p-6">
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={[
                                    { month: 'Jul', masuk: 45, selesai: 38, rate: 84 },
                                    { month: 'Agu', masuk: 52, selesai: 45, rate: 87 },
                                    { month: 'Sep', masuk: 48, selesai: 44, rate: 92 },
                                    { month: 'Okt', masuk: 61, selesai: 55, rate: 90 },
                                    { month: 'Nov', masuk: 55, selesai: 52, rate: 95 },
                                    { month: 'Des', masuk: 68, selesai: 62, rate: 91 },
                                ]}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                onClick={(state) => {
                                    if (state?.activeLabel) onDrilldown(drilldownUrl('month', String(state.activeLabel)));
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-4)" />
                                <XAxis dataKey="month" tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="right" orientation="right" tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} domain={[0, 100]} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar yAxisId="left" dataKey="masuk" name="Masuk" fill="var(--surface-4)" radius={[4, 4, 0, 0]} />
                                <Bar yAxisId="left" dataKey="selesai" name="Selesai" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} />
                                <Line yAxisId="right" type="monotone" dataKey="rate" name="Rate %" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ background: 'var(--surface-4)' }} />
                            <span className="text-xs text-[var(--text-muted)]">Masuk</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ background: 'var(--brand-primary)' }} />
                            <span className="text-xs text-[var(--text-muted)]">Selesai</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: '#8b5cf6' }} />
                            <span className="text-xs text-[var(--text-muted)]">Resolution Rate %</span>
                        </div>
                    </div>
                </div>
            </PresentationSlide>
        </>
    );
}
