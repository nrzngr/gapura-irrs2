'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { QueryDefinition, QueryFilter, FilterOperator, FilterConjunction } from '@/types/builder';

// Color Palette based on screenshot
const COLORS = {
    irregularity: '#4ade80', // Green
    complaint: '#0ea5e9',   // Blue
    compliment: '#facc15',  // Yellow
    terminal: '#4ade80',
    apron: '#0ea5e9',
    general: '#facc15',
    barGreen: '#4ade80'
};
const FIXED_DONUT_RANK_COLORS = ['#81c784', '#13b5cb', '#cddc39'];
const DONUT_FALLBACK_COLORS = ['#66bb6a', '#9ccc65', '#aed581', '#4db6ac', '#80cbc4'];

interface ChartDataItem extends Record<string, unknown> {
    name: string;
    value: number;
    color?: string;
}

// --- DATA ---

// --- DATA ---
// (Unused static data removed)

// --- COMPONENTS ---

export function DonutChart({ title, data, onViewDetail }: { title: string, data: ChartDataItem[], onViewDetail?: () => void }) {
    const rankedData = useMemo(() => {
        return [...data].sort((a, b) => b.value - a.value);
    }, [data]);

    const getSliceColor = (index: number): string => {
        if (index < FIXED_DONUT_RANK_COLORS.length) return FIXED_DONUT_RANK_COLORS[index];
        return DONUT_FALLBACK_COLORS[(index - FIXED_DONUT_RANK_COLORS.length) % DONUT_FALLBACK_COLORS.length];
    };

    return (
        <GlassCard className="h-full flex flex-col relative" padding="md">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{title}</h3>
                {onViewDetail && (
                    <button
                        onClick={onViewDetail}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#6b8e3d] hover:bg-[#5a7a3a] rounded-lg shadow-md hover:shadow-lg transition-all z-10"
                        title="Lihat Detail"
                        style={{ border: '2px solid #4a6a2a' }}
                    >
                        <Eye size={14} />
                        <span>Detail</span>
                    </button>
                )}
            </div>
            <div className="flex-1 min-h-[250px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={rankedData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            labelLine={false}
                            label={({ cx, cy, midAngle, outerRadius, value }) => {
                                const RADIAN = Math.PI / 180;
                                const radius = Number(outerRadius || 0) + 12;
                                const x = Number(cx || 0) + radius * Math.cos(-Number(midAngle || 0) * RADIAN);
                                const y = Number(cy || 0) + radius * Math.sin(-Number(midAngle || 0) * RADIAN);
                                return (
                                    <text
                                        x={x}
                                        y={y}
                                        fill="#374151"
                                        textAnchor={x > Number(cx || 0) ? 'start' : 'end'}
                                        dominantBaseline="central"
                                        fontSize={11}
                                        fontWeight={700}
                                    >
                                        {Number(value || 0).toLocaleString('id-ID')}
                                    </text>
                                );
                            }}
                        >
                            {rankedData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={getSliceColor(index)} strokeWidth={0} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                    <span className="text-3xl font-bold">{rankedData.reduce((acc, cur) => acc + cur.value, 0)}</span>
                </div>
            </div>
        </GlassCard>
    );
}

export function HorizontalBarChart({ title, data, onViewDetail }: { title: string, data: ChartDataItem[], onViewDetail?: () => void }) {
    return (
        <GlassCard className="h-full flex flex-col relative" padding="md">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{title}</h3>
                {onViewDetail && (
                    <button
                        onClick={onViewDetail}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#6b8e3d] hover:bg-[#5a7a3a] rounded-lg shadow-md hover:shadow-lg transition-all z-10"
                        title="Lihat Detail"
                        style={{ border: '2px solid #4a6a2a' }}
                    >
                        <Eye size={14} />
                        <span>Detail</span>
                    </button>
                )}
            </div>
            <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={data}
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                        <XAxis type="number" fontSize={12} stroke="var(--text-secondary)" />
                        <YAxis dataKey="name" type="category" width={80} fontSize={11} stroke="var(--text-secondary)" />
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                        />
                        <Bar dataKey="value" fill={COLORS.barGreen} radius={[0, 4, 4, 0]} barSize={15}>
                            {
                                // Label list logic could go here
                            }
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </GlassCard>
    );
}


// --- FETCHING LOGIC ---
async function fetchChartData(query: QueryDefinition) {
    const res = await fetch('/api/dashboards/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error('Failed to fetch chart data');
    const data = await res.json();
    return (data.rows || []) as ChartDataItem[];
}

interface FilterParams {
    hub: string;
    branch: string;
    maskapai: string;
    airlines: string;
    category: string;
    area: string;
}

interface DashboardData {
    caseCategory: ChartDataItem[];
    hub: ChartDataItem[];
    branch: ChartDataItem[];
    airlines: ChartDataItem[];
    monthly: ChartDataItem[];
}

export function CustomerFeedbackDashboardCharts({ filters }: { filters: FilterParams }) {
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadAllData() {
            setLoading(true);
            try {
                // Construct base filters
                const apiFilters: QueryFilter[] = [];
                if (filters.hub !== 'all') apiFilters.push({ table: 'reports', field: 'hub', operator: 'eq' as FilterOperator, value: filters.hub, conjunction: 'AND' as FilterConjunction });
                if (filters.branch !== 'all') apiFilters.push({ table: 'reports', field: 'branch', operator: 'eq' as FilterOperator, value: filters.branch, conjunction: 'AND' as FilterConjunction });
                if (filters.airlines !== 'all') apiFilters.push({ table: 'reports', field: 'airlines', operator: 'eq' as FilterOperator, value: filters.airlines, conjunction: 'AND' as FilterConjunction });
                if (filters.maskapai !== 'all') apiFilters.push({ table: 'reports', field: 'jenis_maskapai', operator: 'eq' as FilterOperator, value: filters.maskapai, conjunction: 'AND' as FilterConjunction });
                if (filters.category !== 'all') apiFilters.push({ table: 'reports', field: 'category', operator: 'eq' as FilterOperator, value: filters.category, conjunction: 'AND' as FilterConjunction });
                if (filters.area !== 'all') apiFilters.push({ table: 'reports', field: 'area', operator: 'eq' as FilterOperator, value: filters.area, conjunction: 'AND' as FilterConjunction });

                // 1. Case Category Donut
                const caseCategoryQuery: QueryDefinition = {
                    source: 'reports',
                    joins: [],
                    dimensions: [{ table: 'reports', field: 'category', alias: 'name' }],
                    measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'value' }],
                    filters: apiFilters,
                    sorts: [],
                };

                // 2. Hub Bar
                const hubQuery: QueryDefinition = {
                    source: 'reports',
                    joins: [],
                    dimensions: [{ table: 'reports', field: 'hub', alias: 'name' }],
                    measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'value' }],
                    filters: apiFilters,
                    sorts: [{ field: 'value', direction: 'desc' }],
                    limit: 10
                };

                // 3. Branch Bar - Join with stations to get actual station codes
                const branchQuery: QueryDefinition = {
                    source: 'reports',
                    joins: [{ from: 'reports', to: 'stations', joinKey: 'reports_stations' }],
                    dimensions: [{ table: 'stations', field: 'code', alias: 'name' }],
                    measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'value' }],
                    filters: apiFilters,
                    sorts: [{ field: 'value', direction: 'desc' }],
                    limit: 10
                };

                // 4. Airlines Bar
                const airlinesQuery: QueryDefinition = {
                    source: 'reports',
                    joins: [],
                    dimensions: [{ table: 'reports', field: 'airlines', alias: 'name' }],
                    measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'value' }],
                    filters: apiFilters,
                    sorts: [{ field: 'value', direction: 'desc' }],
                    limit: 10
                };

                // 5. Monthly Trend
                const monthlyQuery: QueryDefinition = {
                    source: 'reports',
                    joins: [],
                    dimensions: [{ table: 'reports', field: 'created_at', alias: 'name', dateGranularity: 'month' }],
                    measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'value' }],
                    filters: apiFilters,
                    sorts: [{ field: 'name', direction: 'asc' }],
                    limit: 1000 // Ensure we fetch enough to reach 2026
                };

                // Execute all queries in parallel
                const [caseCat, hubs, branches, airlines, monthly] = await Promise.all([
                    fetchChartData(caseCategoryQuery),
                    fetchChartData(hubQuery),
                    fetchChartData(branchQuery),
                    fetchChartData(airlinesQuery),
                    fetchChartData(monthlyQuery)
                ]);

                // Map colors for donut
                const coloredCaseCat = caseCat.map((item: ChartDataItem) => ({
                    ...item,
                    color: item.name === 'Irregularity' ? COLORS.irregularity : 
                           item.name === 'Complaint' ? COLORS.complaint : COLORS.compliment
                }));

                setData({
                    caseCategory: coloredCaseCat,
                    hub: hubs,
                    branch: branches,
                    airlines: airlines,
                    monthly: [...monthly].slice(-14)
                });
            } catch (err) {
                console.error('Failed to load dashboard data:', err);
            } finally {
                setLoading(false);
            }
        }
        loadAllData();
    }, [filters]);

    if (loading) {
        return <div className="min-h-[600px] flex items-center justify-center text-[var(--text-secondary)] font-medium animate-pulse">Memuat data analisis...</div>;
    }
    
    if (!data) return null;

    const handleViewDetail = (chartTitle: string, chartData: ChartDataItem[], chartType: string, chartId: string, config?: { xAxis?: string, yAxis?: string[], metric?: string }) => {
        // Store data in sessionStorage for the detail page
        const detailData = {
            tile: {
                id: chartId,
                visualization: {
                    chartType: chartType,
                    title: chartTitle,
                    xAxis: config?.xAxis || (chartData[0] ? Object.keys(chartData[0])[0] : ''),
                    yAxis: config?.yAxis || (chartData[0] ? [Object.keys(chartData[0])[1]] : []),
                    colorField: config?.metric,
                    showLegend: true,
                    showLabels: false
                },
                query: {
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
                columns: chartData[0] ? Object.keys(chartData[0]) : [],
                rows: chartData,
                rowCount: chartData.length,
                executionTimeMs: 0
            },
            dashboardId: 'customer-feedback',
            timestamp: Date.now()
        };
        
        sessionStorage.setItem('chartDetailData', JSON.stringify(detailData));
        
        // Navigate to detail page
        const params = new URLSearchParams();
        params.set('dashboardId', 'customer-feedback');
        params.set('tileId', detailData.tile.id);
        
        router.push(`/dashboard/chart-detail?${params.toString()}`);
    };

    return (
        <div className="space-y-6">
            {/* ROW 1: Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[300px]">
                 <DonutChart 
                    title="Report by Case Category" 
                    data={data.caseCategory} 
                    onViewDetail={() => router.push('/dashboard/charts/report-by-case-category/detail')}
                />
                <HorizontalBarChart 
                    title="Hub Report" 
                    data={data.hub} 
                    onViewDetail={() => router.push('/dashboard/charts/hub-report/detail')}
                />
                <HorizontalBarChart 
                    title="Branch Report" 
                    data={data.branch} 
                    onViewDetail={() => router.push('/dashboard/charts/branch-report/detail')}
                />
                <HorizontalBarChart 
                    title="Airlines Report" 
                    data={data.airlines} 
                    onViewDetail={() => handleViewDetail('Airlines Report', data.airlines, 'horizontal_bar', '04f355cf-2ff1-4469-b99f-5ae48da32931')}
                />
                <HorizontalBarChart 
                    title="Monthly Report" 
                    data={data.monthly} 
                    onViewDetail={() => handleViewDetail('Monthly Report', data.monthly, 'horizontal_bar', '13f28a33-6c49-42ea-9554-e3f55519d872')}
                />
            </div>

            {/* Note: Heatmaps logic can be similarly refactored if needed, 
                for now prioritizing the main charts reported as not working. */}
        </div>
    );
}
