'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart as RechartsPie, Pie, Cell, BarChart, Bar, LineChart, Line,
    ComposedChart, LabelList
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

interface CaseReportByAreaAirlineItem {
    name: string;
    terminal: number;
    apron: number;
    general: number;
    total: number;
}

interface CaseReportByAreaBranchItem {
    branch: string;
    airlines: CaseReportByAreaAirlineItem[];
    totalTerminal: number;
    totalApron: number;
    totalGeneral: number;
    grandTotal: number;
}

interface CategoryCountItem {
    name: string;
    value: number;
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
    readonly caseReportByAreaData: readonly CaseReportByAreaBranchItem[];
    readonly terminalAreaCategoryData: readonly CategoryCountItem[];
    readonly apronAreaCategoryData: readonly CategoryCountItem[];
    readonly generalCategoryData: readonly CategoryCountItem[];
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

// Reference color scheme
const REFERENCE_COLORS = {
    irregularity: '#81c784',  // Light green
    complaint: '#4fc3f7',     // Light blue
    compliment: '#dce775',    // Light yellow-green
};

const COLORS = ['#81c784', '#13b5cb', '#cddc39', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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

/** Returns HSL background + foreground color for heat-map cells.
 *  ratio 0 → very light green (#90% L)  |  ratio 1 → dark green (#28% L, white text) */
function heatColor(value: number, max: number): { bg: string; fg: string } {
    if (value === 0 || max === 0) return { bg: 'transparent', fg: '#374151' };
    const ratio = value / max;
    const lightness = Math.round(90 - ratio * 62); // 90% → 28%
    return {
        bg: `hsl(142, 55%, ${lightness}%)`,
        fg: lightness < 52 ? '#ffffff' : '#374151',
    };
}

const PAGE_SIZE = 5;

function CategoryBarList({ data, color = '#4ade80', title }: { data: readonly { name: string; value: number }[]; color?: string; title?: string }) {
    const [page, setPage] = useState(0);
    const totalPages = Math.ceil(data.length / PAGE_SIZE);
    const pageItems = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const maxValue = data[0]?.value || 1;
    const startIdx = page * PAGE_SIZE + 1;
    const endIdx = Math.min((page + 1) * PAGE_SIZE, data.length);

    return (
        <div>
            {title && <h3 className="font-bold text-sm text-gray-800 mb-3">{title}</h3>}
            <div className="space-y-2">
                {pageItems.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                        <span className="text-xs text-gray-700 w-[140px] shrink-0 truncate" title={item.name}>
                            {item.name}
                        </span>
                        <div className="flex-1 flex items-center gap-1.5">
                            <div className="flex-1 bg-gray-100 rounded-sm h-4 overflow-hidden">
                                <div
                                    className="h-full rounded-sm transition-all duration-300"
                                    style={{
                                        width: `${(item.value / maxValue) * 100}%`,
                                        backgroundColor: color,
                                    }}
                                />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 w-7 text-right shrink-0">
                                {item.value}
                            </span>
                        </div>
                    </div>
                ))}
                {data.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">Tidak ada data</p>
                )}
            </div>
            {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 mt-3">
                    <span className="text-[10px] text-gray-500">
                        {startIdx}-{endIdx} / {data.length}
                    </span>
                    <button
                        className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30"
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-30"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            )}
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
    caseReportByAreaData,
    terminalAreaCategoryData,
    apronAreaCategoryData,
    generalCategoryData,
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
    // Derived Data: Sorted Case Category with Rank Colors
    const sortedCaseCategoryData = useMemo(() => {
        return [...caseCategoryData]
            .sort((a, b) => b.value - a.value)
            .map((item, index) => ({
                ...item,
                fill: COLORS[index % COLORS.length]
            }));
    }, [caseCategoryData]);

    const router = useRouter();

    const handleViewDetail = (
        title: string,
        data: any[],
        chartType: string,
        visualizationConfig: any,
        queryConfig?: any
    ) => {
        const detailData = {
            tile: {
                id: `analyst-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                visualization: {
                    title: title,
                    chartType: chartType,
                    ...visualizationConfig
                },
                query: queryConfig || {
                    source: 'reports',
                    joins: [],
                    dimensions: [],
                    measures: [],
                    filters: [],
                    sorts: [],
                    limit: 1000
                },
                layout: { x: 0, y: 0, w: 6, h: 3 }
            },
            result: {
                rows: data,
                columns: Object.keys(data[0] || {}),
                rowCount: data.length,
                executionTimeMs: 0
            },
            dashboardId: 'analyst-dashboard',
            timestamp: Date.now()
        };

        sessionStorage.setItem('chartDetailData', JSON.stringify(detailData));
        
        const params = new URLSearchParams();
        params.set('dashboardId', 'analyst-dashboard');
        params.set('tileId', detailData.tile.id);
        
        router.push(`/dashboard/chart-detail?${params.toString()}`);
    };

    // Derived Data: Airlines Total (Sum of categories)
    const airlinesTotalData = useMemo(() => {
        return categoryByAirlinesData.map(item => ({
            airline: item.airline,
            total: item.irregularity + item.complaint + item.compliment
        })).sort((a, b) => b.total - a.total);
    }, [categoryByAirlinesData]);

    const safeTrendData = useMemo(() => {
        if (analytics?.trendData?.length) return analytics.trendData;
        
        // Fallback: Use monthlyComparisonData which matches { month, total: masuk, resolved: selesai }
        if (monthlyComparisonData && monthlyComparisonData.length > 0) {
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
            { name: 'Selesai', value: resolved, fill: '#81c784' },
            { name: 'Belum Selesai', value: pending, fill: '#cbd5e1' }
        ];
    }, [safeTrendData]);

    // Derived Data: Monthly Volume Distribution (Pie Chart)
    const monthlyVolumeData = useMemo(() => {
        return monthlyReportData
            .map(item => ({
                name: item.month,
                value: item.irregularity + item.complaint + item.compliment
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value)
            .map((item, index) => ({
                ...item,
                fill: COLORS[index % COLORS.length]
            }));
    }, [monthlyReportData]);

    // Derived Data: Status Flow
    const statusFlowData = useMemo(() => [
        { status: 'MENUNGGU_FEEDBACK', label: 'Menunggu Feedback', count: filteredReports.filter(r => r.status === 'MENUNGGU_FEEDBACK').length },
        { status: 'SUDAH_DIVERIFIKASI', label: 'Sudah Diverifikasi', count: filteredReports.filter(r => r.status === 'SUDAH_DIVERIFIKASI').length },
        { status: 'SELESAI', label: 'Selesai', count: filteredReports.filter(r => r.status === 'SELESAI').length },
    ], [filteredReports]);

    // Pivot data for Case Category by Branch table (top 6)
    const pivotTableData = useMemo(() => {
        const data = categoryByBranchData
            .map(item => ({
                branch: item.branch,
                irregularity: item.irregularity,
                complaint: item.complaint,
                compliment: item.compliment,
                total: item.irregularity + item.complaint + item.compliment
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 6);
        
        // Add grand total row
        const grandTotal = data.reduce((acc, row) => ({
            irregularity: acc.irregularity + row.irregularity,
            complaint: acc.complaint + row.complaint,
            compliment: acc.compliment + row.compliment,
            total: acc.total + row.total
        }), { irregularity: 0, complaint: 0, compliment: 0, total: 0 });
        
        return { rows: data, grandTotal };
    }, [categoryByBranchData]);

    // Get max values for heatmap normalization
    const maxValues = useMemo(() => {
        const { rows } = pivotTableData;
        return {
            irregularity: Math.max(...rows.map(r => r.irregularity)),
            complaint: Math.max(...rows.map(r => r.complaint)),
            compliment: Math.max(...rows.map(r => r.compliment))
        };
    }, [pivotTableData]);

    // Category by Area with reference colors
    const categoryByAreaWithColors = useMemo(() => {
        return categoryByAreaData.map((item, index) => ({
            ...item,
            fill: [
                REFERENCE_COLORS.irregularity,
                REFERENCE_COLORS.complaint,
                REFERENCE_COLORS.compliment
            ][index % 3]
        }));
    }, [categoryByAreaData]);

    // Helper function to compute pivot table data
    const computePivotData = (categoryField: string) => {
        // Get all categories and branches
        const categoryBranchCounts: Record<string, Record<string, number>> = {};
        const branchTotals: Record<string, number> = {};
        
        filteredReports.forEach(report => {
            const category = (report as any)[categoryField] || 'Other';
            const branch = report.branch || report.station_code || 'Unknown';
            
            if (!categoryBranchCounts[category]) {
                categoryBranchCounts[category] = {};
            }
            if (!categoryBranchCounts[category][branch]) {
                categoryBranchCounts[category][branch] = 0;
            }
            categoryBranchCounts[category][branch]++;
            
            branchTotals[branch] = (branchTotals[branch] || 0) + 1;
        });
        
        // Get top 3 branches by total volume
        const topBranches = Object.entries(branchTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([branch]) => branch);
        
        // Get top 15 categories by total count (more for scrolling)
        const categoryTotals = Object.entries(categoryBranchCounts).map(([category, branches]) => ({
            category,
            total: Object.values(branches).reduce((sum, count) => sum + count, 0),
            branches
        })).sort((a, b) => b.total - a.total).slice(0, 15);
        
        // Compute grand totals
        const grandTotal: Record<string, number> = { total: 0 };
        topBranches.forEach(branch => {
            grandTotal[branch] = 0;
        });
        
        categoryTotals.forEach(cat => {
            grandTotal.total += cat.total;
            topBranches.forEach(branch => {
                grandTotal[branch] += cat.branches[branch] || 0;
            });
        });
        
        // Compute max values for heatmap
        const maxValues: Record<string, number> = {};
        topBranches.forEach(branch => {
            maxValues[branch] = Math.max(...categoryTotals.map(cat => cat.branches[branch] || 0));
        });
        
        return {
            rows: categoryTotals,
            branches: topBranches,
            grandTotal,
            maxValues
        };
    };

    // Terminal Area by Branch
    const terminalAreaByBranch = useMemo(() => {
        return computePivotData('terminal_area_category');
    }, [filteredReports]);

    // Apron Area by Branch
    const apronAreaByBranch = useMemo(() => {
        return computePivotData('apron_area_category');
    }, [filteredReports]);

    // General Category by Branch
    const generalCategoryByBranch = useMemo(() => {
        return computePivotData('general_category');
    }, [filteredReports]);

    // Helper function to compute airline pivot table data
    const computeAirlinePivotData = (categoryField: string) => {
        // Get all categories and airlines
        const categoryAirlineCounts: Record<string, Record<string, number>> = {};
        const airlineTotals: Record<string, number> = {};
        
        filteredReports.forEach(report => {
            const category = (report as any)[categoryField] || 'Other';
            const airline = report.airline || report.airlines || 'Unknown';
            
            if (!categoryAirlineCounts[category]) {
                categoryAirlineCounts[category] = {};
            }
            if (!categoryAirlineCounts[category][airline]) {
                categoryAirlineCounts[category][airline] = 0;
            }
            categoryAirlineCounts[category][airline]++;
            
            airlineTotals[airline] = (airlineTotals[airline] || 0) + 1;
        });
        
        // Get top 5 airlines sorted by total volume (descending)
        const allAirlines = Object.entries(airlineTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([airline]) => airline);
        
        // Get all categories sorted by total count (descending)
        const categoryTotals = Object.entries(categoryAirlineCounts).map(([category, airlines]) => ({
            category,
            total: Object.values(airlines).reduce((sum, count) => sum + count, 0),
            airlines
        })).sort((a, b) => b.total - a.total);
        
        // Compute grand totals
        const grandTotal: Record<string, number> = { total: 0 };
        allAirlines.forEach(airline => {
            grandTotal[airline] = 0;
        });
        
        categoryTotals.forEach(cat => {
            grandTotal.total += cat.total;
            allAirlines.forEach(airline => {
                grandTotal[airline] += cat.airlines[airline] || 0;
            });
        });
        
        // Compute max values for heatmap
        const maxValues: Record<string, number> = {};
        allAirlines.forEach(airline => {
            maxValues[airline] = Math.max(...categoryTotals.map(cat => cat.airlines[airline] || 0));
        });
        
        return {
            rows: categoryTotals,
            airlines: allAirlines,
            grandTotal,
            maxValues
        };
    };

    // Terminal Area by Airline
    const terminalAreaByAirline = useMemo(() => {
        return computeAirlinePivotData('terminal_area_category');
    }, [filteredReports]);

    // Apron Area by Airline
    const apronAreaByAirline = useMemo(() => {
        return computeAirlinePivotData('apron_area_category');
    }, [filteredReports]);

    // General Category by Airline
    const generalCategoryByAirline = useMemo(() => {
        return computeAirlinePivotData('general_category');
    }, [filteredReports]);

    return (
        <>
            {/* Slide 2: General Categories & Volume Trends */}
            <PresentationSlide
                title="Tren & Distribusi Kategori"
                subtitle="Volume laporan dan proporsi kategori"
                icon={PieChartIcon}
                hint="Klik segmen untuk filter berdasarkan kategori"
            >
                <div className="grid grid-cols-1 gap-4">
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Card 1: Report by Case Category */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h3 className="font-bold text-base text-gray-800 mb-1">Report by Case Category</h3>
                            <div className="h-[220px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPie>
                                        <Pie
                                            data={sortedCaseCategoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={85}
                                            paddingAngle={2}
                                            dataKey="value"
                                            label={({ value }) => value}
                                            labelLine={false}
                                        >
                                            {sortedCaseCategoryData.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={[
                                                        REFERENCE_COLORS.irregularity,
                                                        REFERENCE_COLORS.complaint,
                                                        REFERENCE_COLORS.compliment
                                                    ][index % 3]} 
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </RechartsPie>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap justify-center gap-4 mt-2">
                                {sortedCaseCategoryData.map((s, idx) => (
                                    <div key={s.name} className="flex items-center gap-1.5">
                                        <div 
                                            className="w-3 h-3 rounded-full" 
                                            style={{ 
                                                background: [
                                                    REFERENCE_COLORS.irregularity,
                                                    REFERENCE_COLORS.complaint,
                                                    REFERENCE_COLORS.compliment
                                                ][idx % 3] 
                                            }} 
                                        />
                                        <span className="text-xs text-gray-600">{s.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Card 2: Tren Penyelesaian Bulanan */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h3 className="font-bold text-base text-gray-800 mb-1">Tren Penyelesaian Bulanan</h3>
                            <div className="h-[220px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={safeTrendData.slice(-12)}
                                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis 
                                            dataKey="month" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#374151', fontSize: 10 }}
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#374151', fontSize: 10 }}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Line 
                                            type="monotone" 
                                            dataKey="total" 
                                            name="Laporan Masuk"
                                            stroke="#4fc3f7" 
                                            strokeWidth={2}
                                            dot={{ fill: '#4fc3f7', strokeWidth: 0, r: 3 }}
                                            activeDot={{ r: 5 }}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="resolved" 
                                            name="Selesai"
                                            stroke="#81c784" 
                                            strokeWidth={2}
                                            dot={{ fill: '#81c784', strokeWidth: 0, r: 3 }}
                                            activeDot={{ r: 5 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap justify-center gap-4 mt-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full" style={{ background: '#4fc3f7' }} />
                                    <span className="text-xs text-gray-600">Laporan Masuk</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full" style={{ background: '#81c784' }} />
                                    <span className="text-xs text-gray-600">Selesai</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Card 3: Category by Area */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h3 className="font-bold text-base text-gray-800 mb-1">Category by Area</h3>
                            <div className="h-[220px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPie>
                                        <Pie
                                            data={categoryByAreaWithColors}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={85}
                                            paddingAngle={2}
                                            dataKey="value"
                                            label={({ value }) => value}
                                            labelLine={false}
                                        >
                                            {categoryByAreaWithColors.map((entry, index) => (
                                                <Cell key={`cell-area-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </RechartsPie>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap justify-center gap-4 mt-2">
                                {categoryByAreaWithColors.map((s) => (
                                    <div key={s.name} className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full" style={{ background: s.fill }} />
                                        <span className="text-xs text-gray-600">{s.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Card 4: Case Category by Branch (Pivot Table) */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h3 className="font-bold text-base text-gray-800 mb-1">Case Category by Branch</h3>
                            <p className="text-xs text-gray-500 mb-3">Report Category / Record Count</p>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left py-2 px-2 font-semibold text-gray-700">Branch</th>
                                            <th className="text-center py-2 px-2 font-semibold text-gray-700">Irregularity</th>
                                            <th className="text-center py-2 px-2 font-semibold text-gray-700">Complaint</th>
                                            <th className="text-center py-2 px-2 font-semibold text-gray-700">Compliment</th>
                                            <th className="text-center py-2 px-2 font-semibold text-gray-700">Grand total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pivotTableData.rows.map((row) => (
                                            <tr key={row.branch} className="border-b border-gray-100">
                                                <td className="py-2 px-2 font-medium text-gray-800">{row.branch}</td>
                                                <td 
                                                    className="py-2 px-2 text-center font-medium"
                                                    style={{
                                                        backgroundColor: `rgba(129, 199, 132, ${row.irregularity / maxValues.irregularity * 0.3 + 0.1})`
                                                    }}
                                                >
                                                    {row.irregularity || '-'}
                                                </td>
                                                <td 
                                                    className="py-2 px-2 text-center font-medium"
                                                    style={{
                                                        backgroundColor: `rgba(79, 195, 247, ${row.complaint / maxValues.complaint * 0.3 + 0.1})`
                                                    }}
                                                >
                                                    {row.complaint || '-'}
                                                </td>
                                                <td 
                                                    className="py-2 px-2 text-center font-medium"
                                                    style={{
                                                        backgroundColor: `rgba(220, 231, 117, ${row.compliment / maxValues.compliment * 0.3 + 0.1})`
                                                    }}
                                                >
                                                    {row.compliment || '-'}
                                                </td>
                                                <td className="py-2 px-2 text-center font-bold text-gray-800 bg-gray-50">
                                                    {row.total}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Grand Total Row */}
                                        <tr className="bg-gray-100 font-bold">
                                            <td className="py-2 px-2 text-gray-800">Grand total</td>
                                            <td className="py-2 px-2 text-center text-gray-800">
                                                {pivotTableData.grandTotal.irregularity}
                                            </td>
                                            <td className="py-2 px-2 text-center text-gray-800">
                                                {pivotTableData.grandTotal.complaint}
                                            </td>
                                            <td className="py-2 px-2 text-center text-gray-800">
                                                {pivotTableData.grandTotal.compliment}
                                            </td>
                                            <td className="py-2 px-2 text-center text-gray-800">
                                                {pivotTableData.grandTotal.total}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Area and Sub-Category Breakdown (Full Width - PRESERVED) */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-base text-gray-800">Area and Sub-Category Breakdown</h3>
                                <p className="text-xs text-gray-500">Detail kategori per wilayah</p>
                            </div>
                        </div>
                        <div className="h-[280px] sm:h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={areaSubCategoryData as any[]}
                                    margin={{ top: 25, right: 10, left: -20, bottom: 5 }}
                                    barCategoryGap="30%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                                    <XAxis dataKey="area" tick={<WrappedXAxisTick />} axisLine={false} tickLine={false} height={80} interval={0} />
                                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
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
                                                fill="#6b7280" 
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
                                    <span className="text-[10px] text-gray-600">{cat}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Row 4: Case Report by Area table + 3 Category Bar Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {/* Case Report by Area */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h3 className="font-bold text-sm text-gray-800 mb-0.5">Case Report by Area</h3>
                            <p className="text-[10px] text-gray-500 mb-3">Area Report / Branch by Airlines</p>
                            {caseReportByAreaData.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-6">Tidak ada data</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    {/* scrollable body — ~5 rows visible */}
                                    <div className="max-h-[188px] overflow-y-auto">
                                        <table className="w-full text-xs min-w-[320px]">
                                            <thead className="sticky top-0 z-10 bg-white">
                                                <tr className="border-b border-gray-200">
                                                    <th className="text-left py-1.5 px-1.5 font-semibold text-gray-700">Branch</th>
                                                    <th className="text-left py-1.5 px-1.5 font-semibold text-gray-700">Airlines</th>
                                                    <th className="text-center py-1.5 px-1.5 font-semibold text-gray-700">Terminal<br/>Area</th>
                                                    <th className="text-center py-1.5 px-1.5 font-semibold text-gray-700">Apron<br/>Area</th>
                                                    <th className="text-center py-1.5 px-1.5 font-semibold text-gray-700">General</th>
                                                    <th className="text-center py-1.5 px-1.5 font-semibold text-gray-700">Grand<br/>total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    // Max across individual airline cells (not branch totals)
                                                    const allRows = caseReportByAreaData.flatMap(b => b.airlines);
                                                    const maxT = Math.max(...allRows.map(a => a.terminal), 1);
                                                    const maxA = Math.max(...allRows.map(a => a.apron), 1);
                                                    const maxG = Math.max(...allRows.map(a => a.general), 1);
                                                    const maxTotal = Math.max(...allRows.map(a => a.total), 1);
                                                    return caseReportByAreaData.flatMap((branchRow) =>
                                                        branchRow.airlines.map((airline, aIdx) => {
                                                            const tC = heatColor(airline.terminal, maxT);
                                                            const aC = heatColor(airline.apron, maxA);
                                                            const gC = heatColor(airline.general, maxG);
                                                            const totC = heatColor(airline.total, maxTotal);
                                                            return (
                                                                <tr
                                                                    key={`${branchRow.branch}-${airline.name}`}
                                                                    className={`border-b border-gray-100 hover:bg-gray-50${aIdx === 0 ? ' border-t border-t-gray-300' : ''}`}
                                                                >
                                                                    <td className="py-1.5 px-1.5 font-bold text-gray-800 border-r border-gray-100 whitespace-nowrap">
                                                                        {aIdx === 0 ? branchRow.branch : ''}
                                                                    </td>
                                                                    <td className="py-1.5 px-1.5 text-gray-700 whitespace-nowrap">{airline.name}</td>
                                                                    <td className="py-1.5 px-1.5 text-center font-medium" style={{ backgroundColor: tC.bg, color: tC.fg }}>
                                                                        {airline.terminal || '-'}
                                                                    </td>
                                                                    <td className="py-1.5 px-1.5 text-center font-medium" style={{ backgroundColor: aC.bg, color: aC.fg }}>
                                                                        {airline.apron || '-'}
                                                                    </td>
                                                                    <td className="py-1.5 px-1.5 text-center font-medium" style={{ backgroundColor: gC.bg, color: gC.fg }}>
                                                                        {airline.general || '-'}
                                                                    </td>
                                                                    <td className="py-1.5 px-1.5 text-center font-bold" style={{ backgroundColor: totC.bg, color: totC.fg }}>
                                                                        {airline.total}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    );
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Grand Total pinned below scroll area */}
                                    <table className="w-full text-xs min-w-[320px] border-t-2 border-gray-300">
                                        <tbody>
                                            <tr className="bg-gray-100 font-bold">
                                                <td className="py-1.5 px-1.5 text-gray-800" colSpan={2}>Grand total</td>
                                                <td className="py-1.5 px-1.5 text-center text-gray-800">
                                                    {caseReportByAreaData.reduce((s, b) => s + b.totalTerminal, 0)}
                                                </td>
                                                <td className="py-1.5 px-1.5 text-center text-gray-800">
                                                    {caseReportByAreaData.reduce((s, b) => s + b.totalApron, 0)}
                                                </td>
                                                <td className="py-1.5 px-1.5 text-center text-gray-800">
                                                    {caseReportByAreaData.reduce((s, b) => s + b.totalGeneral, 0)}
                                                </td>
                                                <td className="py-1.5 px-1.5 text-center text-gray-800">
                                                    {caseReportByAreaData.reduce((s, b) => s + b.grandTotal, 0)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Terminal Area Category */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h3 className="font-bold text-sm text-gray-800 mb-1">Terminal Area Category</h3>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Category</span>
                                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Total</span>
                            </div>
                            <CategoryBarList data={terminalAreaCategoryData} color="#4ade80" />
                        </div>

                        {/* Apron Area Category */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h3 className="font-bold text-sm text-gray-800 mb-1">Apron Area Category</h3>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Category</span>
                                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Total</span>
                            </div>
                            <CategoryBarList data={apronAreaCategoryData} color="#4ade80" />
                        </div>

                        {/* General Category */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h3 className="font-bold text-sm text-gray-800 mb-1">General Category</h3>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Category</span>
                                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Total</span>
                            </div>
                            <CategoryBarList data={generalCategoryData} color="#4ade80" />
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
                                        onClick={() => {
                                            handleViewDetail(
                                                'Total Laporan per Stasiun',
                                                branchReportData as any[],
                                                'bar',
                                                {
                                                    xAxis: 'station',
                                                    yAxis: ['count'],
                                                    showLegend: false
                                                },
                                                {
                                                    source: 'reports',
                                                    dimensions: ['station'],
                                                    measures: ['count']
                                                }
                                            );
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

                    {/* Category by Branch (Grouped Vertical) */}
                    <div className="card-solid p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Kategori per Stasiun</h3>
                                <p className="text-xs text-[var(--text-muted)]">Breakdown tipe laporan per cabang</p>
                            </div>
                        </div>
                        {/* Scrollable so all branches are visible */}
                        <div className="overflow-x-auto">
                            <div style={{ width: Math.max(480, categoryByBranchData.length * 90), height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={categoryByBranchData as CategoryByBranchItem[]}
                                        margin={{ top: 16, right: 16, left: -10, bottom: 8 }}
                                        barCategoryGap="25%"
                                        barGap={3}
                                        onClick={() => {
                                            handleViewDetail(
                                                'Kategori per Stasiun',
                                                categoryByBranchData as any[],
                                                'bar',
                                                {
                                                    barmode: 'group',
                                                    xAxis: 'branch',
                                                    yAxis: ['irregularity', 'complaint', 'compliment']
                                                },
                                                {
                                                    source: 'reports',
                                                    dimensions: ['station', 'category'],
                                                    measures: ['count']
                                                }
                                            );
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-4)" />
                                        <XAxis
                                            dataKey="branch"
                                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend
                                            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                                            iconType="square"
                                            iconSize={10}
                                        />
                                        <Bar dataKey="irregularity" name="Irregularity" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28}>
                                            <LabelList dataKey="irregularity" position="top" style={{ fill: '#6b7280', fontSize: 9 }} formatter={(v: any) => v > 0 ? v : ''} />
                                        </Bar>
                                        <Bar dataKey="complaint" name="Complaint" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={28}>
                                            <LabelList dataKey="complaint" position="top" style={{ fill: '#6b7280', fontSize: 9 }} formatter={(v: any) => v > 0 ? v : ''} />
                                        </Bar>
                                        <Bar dataKey="compliment" name="Compliment" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={28}>
                                            <LabelList dataKey="compliment" position="top" style={{ fill: '#6b7280', fontSize: 9 }} formatter={(v: any) => v > 0 ? v : ''} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 2: Detail Area/Category by Branch Pivot Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
                    {/* Card 3: Detail Terminal Area by Branch */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col" style={{ height: '400px' }}>
                        <h3 className="font-bold text-base text-gray-800 mb-1 shrink-0">Detail Terminal Area by Branch</h3>
                        <div className="flex-1 mt-2 overflow-hidden flex flex-col min-h-0">
                            <div className="overflow-auto border border-gray-200 flex-1">
                                <table className="w-full text-xs" style={{ minWidth: '300px' }}>
                                    <thead className="bg-green-500 text-white sticky top-0 z-10">
                                        <tr>
                                            <th className="text-left py-2 px-2 font-semibold w-32">Category</th>
                                            {terminalAreaByBranch.branches.map((branch: string) => (
                                                <th key={branch} className="text-center py-2 px-1 font-semibold whitespace-nowrap">{branch}</th>
                                            ))}
                                            <th className="text-center py-2 px-2 font-semibold whitespace-nowrap">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {terminalAreaByBranch.rows.map((row: any, idx: number) => (
                                            <tr key={idx} className="border-b border-gray-100">
                                                <td className="py-2 px-2 font-medium text-gray-800 truncate w-32" title={row.category}>
                                                    {row.category}
                                                </td>
                                                {terminalAreaByBranch.branches.map((branch: string) => (
                                                    <td 
                                                        key={branch}
                                                        className="py-2 px-1 text-center font-medium whitespace-nowrap"
                                                        style={{
                                                            backgroundColor: row.branches[branch] 
                                                                ? `rgba(129, 199, 132, ${(row.branches[branch] || 0) / terminalAreaByBranch.maxValues[branch] * 0.5 + 0.1})`
                                                                : 'transparent'
                                                        }}
                                                    >
                                                        {row.branches[branch] || '-'}
                                                    </td>
                                                ))}
                                                <td className="py-2 px-2 text-center font-bold text-gray-800 bg-gray-50 whitespace-nowrap">
                                                    {row.total}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Grand Total Row */}
                                        <tr className="bg-gray-100 font-bold">
                                            <td className="py-2 px-2 text-gray-800">Grand Total</td>
                                            {terminalAreaByBranch.branches.map((branch: string) => (
                                                <td key={branch} className="py-2 px-1 text-center text-gray-800 whitespace-nowrap">
                                                    {terminalAreaByBranch.grandTotal[branch]}
                                                </td>
                                            ))}
                                            <td className="py-2 px-2 text-center text-gray-800 whitespace-nowrap">
                                                {terminalAreaByBranch.grandTotal.total}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Card 4: Detail Apron Area by Branch */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col" style={{ height: '400px' }}>
                        <h3 className="font-bold text-base text-gray-800 mb-1 shrink-0">Detail Apron Area by Branch</h3>
                        <div className="flex-1 mt-2 overflow-hidden flex flex-col min-h-0">
                            <div className="overflow-auto border border-gray-200 flex-1">
                                <table className="w-full text-xs" style={{ minWidth: '300px' }}>
                                    <thead className="bg-green-500 text-white sticky top-0 z-10">
                                        <tr>
                                            <th className="text-left py-2 px-2 font-semibold w-32">Category</th>
                                            {apronAreaByBranch.branches.map((branch: string) => (
                                                <th key={branch} className="text-center py-2 px-1 font-semibold whitespace-nowrap">{branch}</th>
                                            ))}
                                            <th className="text-center py-2 px-2 font-semibold whitespace-nowrap">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {apronAreaByBranch.rows.map((row: any, idx: number) => (
                                            <tr key={idx} className="border-b border-gray-100">
                                                <td className="py-2 px-2 font-medium text-gray-800 truncate w-32" title={row.category}>
                                                    {row.category}
                                                </td>
                                                {apronAreaByBranch.branches.map((branch: string) => (
                                                    <td 
                                                        key={branch}
                                                        className="py-2 px-1 text-center font-medium whitespace-nowrap"
                                                        style={{
                                                            backgroundColor: row.branches[branch] 
                                                                ? `rgba(129, 199, 132, ${(row.branches[branch] || 0) / apronAreaByBranch.maxValues[branch] * 0.5 + 0.1})`
                                                                : 'transparent'
                                                        }}
                                                    >
                                                        {row.branches[branch] || '-'}
                                                    </td>
                                                ))}
                                                <td className="py-2 px-2 text-center font-bold text-gray-800 bg-gray-50 whitespace-nowrap">
                                                    {row.total}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Grand Total Row */}
                                        <tr className="bg-gray-100 font-bold">
                                            <td className="py-2 px-2 text-gray-800">Grand Total</td>
                                            {apronAreaByBranch.branches.map((branch: string) => (
                                                <td key={branch} className="py-2 px-1 text-center text-gray-800 whitespace-nowrap">
                                                    {apronAreaByBranch.grandTotal[branch]}
                                                </td>
                                            ))}
                                            <td className="py-2 px-2 text-center text-gray-800 whitespace-nowrap">
                                                {apronAreaByBranch.grandTotal.total}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Card 5: Detail General Category by Branch */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col" style={{ height: '400px' }}>
                        <h3 className="font-bold text-base text-gray-800 mb-1 shrink-0">Detail General Category by Branch</h3>
                        <div className="flex-1 mt-2 overflow-hidden flex flex-col min-h-0">
                            <div className="overflow-auto border border-gray-200 flex-1">
                                <table className="w-full text-xs" style={{ minWidth: '300px' }}>
                                    <thead className="bg-green-500 text-white sticky top-0 z-10">
                                        <tr>
                                            <th className="text-left py-2 px-2 font-semibold w-32">Category</th>
                                            {generalCategoryByBranch.branches.map((branch: string) => (
                                                <th key={branch} className="text-center py-2 px-1 font-semibold whitespace-nowrap">{branch}</th>
                                            ))}
                                            <th className="text-center py-2 px-2 font-semibold whitespace-nowrap">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {generalCategoryByBranch.rows.map((row: any, idx: number) => (
                                            <tr key={idx} className="border-b border-gray-100">
                                                <td className="py-2 px-2 font-medium text-gray-800 truncate w-32" title={row.category}>
                                                    {row.category}
                                                </td>
                                                {generalCategoryByBranch.branches.map((branch: string) => (
                                                    <td 
                                                        key={branch}
                                                        className="py-2 px-1 text-center font-medium whitespace-nowrap"
                                                        style={{
                                                            backgroundColor: row.branches[branch] 
                                                                ? `rgba(129, 199, 132, ${(row.branches[branch] || 0) / generalCategoryByBranch.maxValues[branch] * 0.5 + 0.1})`
                                                                : 'transparent'
                                                        }}
                                                    >
                                                        {row.branches[branch] || '-'}
                                                    </td>
                                                ))}
                                                <td className="py-2 px-2 text-center font-bold text-gray-800 bg-gray-50 whitespace-nowrap">
                                                    {row.total}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Grand Total Row */}
                                        <tr className="bg-gray-100 font-bold">
                                            <td className="py-2 px-2 text-gray-800">Grand Total</td>
                                            {generalCategoryByBranch.branches.map((branch: string) => (
                                                <td key={branch} className="py-2 px-1 text-center text-gray-800 whitespace-nowrap">
                                                    {generalCategoryByBranch.grandTotal[branch]}
                                                </td>
                                            ))}
                                            <td className="py-2 px-2 text-center text-gray-800 whitespace-nowrap">
                                                {generalCategoryByBranch.grandTotal.total}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
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
                                        onClick={() => {
                                            handleViewDetail(
                                                'Total Laporan Maskapai',
                                                airlinesTotalData,
                                                'bar',
                                                {
                                                    xAxis: 'airline',
                                                    yAxis: ['total'],
                                                    showLegend: false
                                                },
                                                {
                                                    source: 'reports',
                                                    dimensions: ['airline'],
                                                    measures: ['count']
                                                }
                                            );
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
                                    onClick={() => {
                                        handleViewDetail(
                                            'Kategori per Maskapai',
                                            categoryByAirlinesData as any[],
                                            'bar',
                                            {
                                                xAxis: 'airline',
                                                yAxis: ['irregularity', 'complaint', 'compliment'],
                                                barmode: 'group'
                                            },
                                            {
                                                source: 'reports',
                                                dimensions: ['airline', 'category'],
                                                measures: ['count']
                                            }
                                        );
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

                    {/* Row 2: Detail Area/Category by Airlines Pivot Tables */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
                        {/* Card 1: Detail Terminal Area by Airlines */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col" style={{ height: '400px' }}>
                            <h3 className="font-bold text-base text-gray-800 mb-1 shrink-0">Detail Terminal Area by Airlines</h3>
                            <div className="flex-1 mt-2 overflow-hidden flex flex-col min-h-0">
                                <div className="overflow-auto border border-gray-200 flex-1">
                                    <table className="w-full text-xs" style={{ minWidth: '400px' }}>
                                        <thead className="bg-green-500 text-white sticky top-0 z-10">
                                            <tr>
                                                <th className="text-left py-2 px-2 font-semibold w-32">Category</th>
                                                {terminalAreaByAirline.airlines.map((airline: string) => (
                                                    <th key={airline} className="text-center py-2 px-1 font-semibold whitespace-nowrap">{airline}</th>
                                                ))}
                                                <th className="text-center py-2 px-2 font-semibold whitespace-nowrap">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {terminalAreaByAirline.rows.map((row: any, idx: number) => (
                                                <tr key={idx} className="border-b border-gray-100">
                                                    <td className="py-2 px-2 font-medium text-gray-800 truncate w-32" title={row.category}>
                                                        {row.category}
                                                    </td>
                                                    {terminalAreaByAirline.airlines.map((airline: string) => (
                                                        <td 
                                                            key={airline}
                                                            className="py-2 px-1 text-center font-medium whitespace-nowrap"
                                                            style={{
                                                                backgroundColor: row.airlines[airline] 
                                                                    ? `rgba(129, 199, 132, ${(row.airlines[airline] || 0) / terminalAreaByAirline.maxValues[airline] * 0.5 + 0.1})`
                                                                    : 'transparent'
                                                            }}
                                                        >
                                                            {row.airlines[airline] || '-'}
                                                        </td>
                                                    ))}
                                                    <td className="py-2 px-2 text-center font-bold text-gray-800 bg-gray-50 whitespace-nowrap">
                                                        {row.total}
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Grand Total Row */}
                                            <tr className="bg-gray-100 font-bold">
                                                <td className="py-2 px-2 text-gray-800">Grand total</td>
                                                {terminalAreaByAirline.airlines.map((airline: string) => (
                                                    <td key={airline} className="py-2 px-1 text-center text-gray-800 whitespace-nowrap">
                                                        {terminalAreaByAirline.grandTotal[airline]}
                                                    </td>
                                                ))}
                                                <td className="py-2 px-2 text-center text-gray-800 whitespace-nowrap">
                                                    {terminalAreaByAirline.grandTotal.total}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Detail Apron Area by Airlines */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col" style={{ height: '400px' }}>
                            <h3 className="font-bold text-base text-gray-800 mb-1 shrink-0">Detail Apron Area by Airlines</h3>
                            <div className="flex-1 mt-2 overflow-hidden flex flex-col min-h-0">
                                <div className="overflow-auto border border-gray-200 flex-1">
                                    <table className="w-full text-xs" style={{ minWidth: '400px' }}>
                                        <thead className="bg-green-500 text-white sticky top-0 z-10">
                                            <tr>
                                                <th className="text-left py-2 px-2 font-semibold w-32">Category</th>
                                                {apronAreaByAirline.airlines.map((airline: string) => (
                                                    <th key={airline} className="text-center py-2 px-1 font-semibold whitespace-nowrap">{airline}</th>
                                                ))}
                                                <th className="text-center py-2 px-2 font-semibold whitespace-nowrap">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {apronAreaByAirline.rows.map((row: any, idx: number) => (
                                                <tr key={idx} className="border-b border-gray-100">
                                                    <td className="py-2 px-2 font-medium text-gray-800 truncate w-32" title={row.category}>
                                                        {row.category}
                                                    </td>
                                                    {apronAreaByAirline.airlines.map((airline: string) => (
                                                        <td 
                                                            key={airline}
                                                            className="py-2 px-1 text-center font-medium whitespace-nowrap"
                                                            style={{
                                                                backgroundColor: row.airlines[airline] 
                                                                    ? `rgba(129, 199, 132, ${(row.airlines[airline] || 0) / apronAreaByAirline.maxValues[airline] * 0.5 + 0.1})`
                                                                    : 'transparent'
                                                            }}
                                                        >
                                                            {row.airlines[airline] || '-'}
                                                        </td>
                                                    ))}
                                                    <td className="py-2 px-2 text-center font-bold text-gray-800 bg-gray-50 whitespace-nowrap">
                                                        {row.total}
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Grand Total Row */}
                                            <tr className="bg-gray-100 font-bold">
                                                <td className="py-2 px-2 text-gray-800">Grand total</td>
                                                {apronAreaByAirline.airlines.map((airline: string) => (
                                                    <td key={airline} className="py-2 px-1 text-center text-gray-800 whitespace-nowrap">
                                                        {apronAreaByAirline.grandTotal[airline]}
                                                    </td>
                                                ))}
                                                <td className="py-2 px-2 text-center text-gray-800 whitespace-nowrap">
                                                    {apronAreaByAirline.grandTotal.total}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Card 3: Detail General Category by Airlines */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col" style={{ height: '400px' }}>
                            <h3 className="font-bold text-base text-gray-800 mb-1 shrink-0">Detail General Category by Airlines</h3>
                            <div className="flex-1 mt-2 overflow-hidden flex flex-col min-h-0">
                                <div className="overflow-auto border border-gray-200 flex-1">
                                    <table className="w-full text-xs" style={{ minWidth: '400px' }}>
                                        <thead className="bg-green-500 text-white sticky top-0 z-10">
                                            <tr>
                                                <th className="text-left py-2 px-2 font-semibold w-32">Category</th>
                                                {generalCategoryByAirline.airlines.map((airline: string) => (
                                                    <th key={airline} className="text-center py-2 px-1 font-semibold whitespace-nowrap">{airline}</th>
                                                ))}
                                                <th className="text-center py-2 px-2 font-semibold whitespace-nowrap">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {generalCategoryByAirline.rows.map((row: any, idx: number) => (
                                                <tr key={idx} className="border-b border-gray-100">
                                                    <td className="py-2 px-2 font-medium text-gray-800 truncate w-32" title={row.category}>
                                                        {row.category}
                                                    </td>
                                                    {generalCategoryByAirline.airlines.map((airline: string) => (
                                                        <td 
                                                            key={airline}
                                                            className="py-2 px-1 text-center font-medium whitespace-nowrap"
                                                            style={{
                                                                backgroundColor: row.airlines[airline] 
                                                                    ? `rgba(129, 199, 132, ${(row.airlines[airline] || 0) / generalCategoryByAirline.maxValues[airline] * 0.5 + 0.1})`
                                                                    : 'transparent'
                                                            }}
                                                        >
                                                            {row.airlines[airline] || '-'}
                                                        </td>
                                                    ))}
                                                    <td className="py-2 px-2 text-center font-bold text-gray-800 bg-gray-50 whitespace-nowrap">
                                                        {row.total}
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Grand Total Row */}
                                            <tr className="bg-gray-100 font-bold">
                                                <td className="py-2 px-2 text-gray-800">Grand total</td>
                                                {generalCategoryByAirline.airlines.map((airline: string) => (
                                                    <td key={airline} className="py-2 px-1 text-center text-gray-800 whitespace-nowrap">
                                                        {generalCategoryByAirline.grandTotal[airline]}
                                                    </td>
                                                ))}
                                                <td className="py-2 px-2 text-center text-gray-800 whitespace-nowrap">
                                                    {generalCategoryByAirline.grandTotal.total}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
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
                                    <div 
                                        key={reporter.name} 
                                        className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors"
                                        onClick={() => {
                                            handleViewDetail(
                                                'Top Pelapor',
                                                topReportersData as any[],
                                                'bar',
                                                {
                                                    xAxis: 'name',
                                                    yAxis: ['count'],
                                                    layout: 'vertical',
                                                    showLegend: false
                                                },
                                                {
                                                    source: 'reports',
                                                    dimensions: ['reporter_name'],
                                                    measures: ['count']
                                                }
                                            );
                                        }}
                                    >
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
                        {statusFlowData.map((item) => {
                            const cfg = STATUS_CONFIG[item.status as ReportStatus];
                            const percentage = filteredReports.length > 0 ? (item.count / filteredReports.length) * 100 : 0;
                            
                            return (
                                <div 
                                    key={item.status} 
                                    className="cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                                    onClick={() => {
                                        handleViewDetail(
                                            'Alur Status',
                                            statusFlowData,
                                            'bar',
                                            {
                                                xAxis: 'label',
                                                yAxis: ['count'],
                                                showLegend: false
                                            },
                                            {
                                                source: 'reports',
                                                dimensions: ['status'],
                                                measures: ['count']
                                            }
                                        );
                                    }}
                                >
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: `${cfg?.color}20`, color: cfg?.color }}>{item.label}</span>
                                        <span className="text-sm font-medium">{item.count} ({percentage.toFixed(1)}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div className="h-2 rounded-full" style={{ width: `${percentage}%`, backgroundColor: cfg?.color }}></div>
                                    </div>
                                </div>
                            )
                        })}
                        </div>
                    </div>
                </div>
            </PresentationSlide>
        </>
    );
}
