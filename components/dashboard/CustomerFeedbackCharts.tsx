'use client';

import { useState } from 'react';
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

// --- DATA ---

const caseCategoryData = [
    { name: 'Irregularity', value: 276, color: COLORS.irregularity }, // Green
    { name: 'Complaint', value: 133, color: COLORS.complaint },     // Blue
    { name: 'Compliment', value: 18, color: COLORS.compliment },    // Yellow
];

const areaCategoryData = [
    { name: 'Terminal Area', value: 211, color: COLORS.terminal },
    { name: 'Apron Area', value: 152, color: COLORS.apron },
    { name: 'General', value: 64, color: COLORS.general },
];

const branchData = [
    { name: 'CGK', value: 227 },
    { name: 'DPS', value: 74 },
    { name: 'SUB', value: 41 },
    { name: 'KNO', value: 13 },
    { name: 'YIA', value: 11 },
    { name: 'BKS', value: 8 },
    { name: 'UPG', value: 8 },
    { name: 'MDC', value: 7 },
    { name: 'TKG', value: 5 },
    { name: 'PKU', value: 4 },
].reverse(); // Reverse for vertical bar chart to show top at top if layout was horizontal, but here we use vertical bars

const airlinesData = [
    { name: 'Garuda Indonesia', value: 147 },
    { name: 'Citilink', value: 48 },
    { name: 'Pelita Air', value: 34 },
    { name: 'Scoot', value: 25 },
    { name: 'VietJet Air', value: 21 },
    { name: 'China Southern', value: 19 },
    { name: 'Thai Airways', value: 18 },
    { name: 'Korean Air', value: 10 },
    { name: 'China Airlines', value: 15 },
    { name: 'Non Airline Case', value: 13 },
];

const monthlyData = [
    { name: 'December', value: 58 },
    { name: 'November', value: 27 },
    { name: 'October', value: 56 }, // Est
    { name: 'September', value: 58 },
    { name: 'August', value: 57 },
    { name: 'July', value: 17 },
    { name: 'June', value: 7 },
    { name: 'May', value: 22 },
    { name: 'April', value: 43 },
    { name: 'March', value: 17 },
    { name: 'February', value: 34 },
    { name: 'January', value: 31 },
];

const branchHeatmapData = [
    { branch: 'CGK', irregularity: 133, complaint: 82, compliment: 12, total: 227 },
    { branch: 'DPS', irregularity: 57, complaint: 17, compliment: 0, total: 74 },
    { branch: 'SUB', irregularity: 31, complaint: 8, compliment: 2, total: 41 },
    { branch: 'KNO', irregularity: 9, complaint: 4, compliment: 0, total: 13 },
    { branch: 'YIA', irregularity: 9, complaint: 2, compliment: 0, total: 11 },
];

const airlinesHeatmapData = [
    { airline: 'Garuda Indonesia', irregularity: 96, complaint: 48, compliment: 3, total: 147 },
    { airline: 'Citilink', irregularity: 34, complaint: 12, compliment: 2, total: 48 },
    { airline: 'Pelita Air', irregularity: 19, complaint: 13, compliment: 2, total: 34 },
    { airline: 'Scoot', irregularity: 20, complaint: 4, compliment: 1, total: 25 },
    { airline: 'VietJet Air', irregularity: 17, complaint: 4, compliment: 0, total: 21 },
];


// --- COMPONENTS ---

export function DonutChart({ title, data, centerTotal, onViewDetail }: { title: string, data: any[], centerTotal?: number, onViewDetail?: () => void }) {
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
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                    <span className="text-3xl font-bold">{data.reduce((acc, cur) => acc + cur.value, 0)}</span>
                </div>
            </div>
        </GlassCard>
    );
}

export function HorizontalBarChart({ title, data, onViewDetail }: { title: string, data: any[], onViewDetail?: () => void }) {
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

const HEATMAP_GREEN = '#6b8e3d';
const HEATMAP_BANNER = '#5a7a3a';

import { HeatmapChart } from '@/components/charts/HeatmapChart';

// ... (keep existing imports)

// Delete local HeatmapTable function and use HeatmapChart in JSX
export function CustomerFeedbackDashboardCharts() {
    const router = useRouter();

    // Transform data for Heatmap (Flattening)
    const flattenBranchData = branchHeatmapData.flatMap(item => [
        { branch: item.branch, category: 'Irregularity', count: item.irregularity },
        { branch: item.branch, category: 'Complaint', count: item.complaint },
        { branch: item.branch, category: 'Compliment', count: item.compliment }
    ]);
    
    const flattenAirlineData = airlinesHeatmapData.flatMap(item => [
         { airline: item.airline, category: 'Irregularity', count: item.irregularity },
         { airline: item.airline, category: 'Complaint', count: item.complaint },
         { airline: item.airline, category: 'Compliment', count: item.compliment }
    ]);

    const handleViewDetail = (chartTitle: string, data: any[], chartType: string, config?: { xAxis?: string, yAxis?: string[], metric?: string }) => {
        // Store data in sessionStorage for the detail page
        const detailData = {
            tile: {
                id: `chart-${Date.now()}`,
                visualization: {
                    chartType: chartType,
                    title: chartTitle,
                    xAxis: config?.xAxis || (data[0] ? Object.keys(data[0])[0] : ''),
                    yAxis: config?.yAxis || (data[0] ? [Object.keys(data[0])[1]] : []),
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
                columns: data[0] ? Object.keys(data[0]) : [],
                rows: data,
                rowCount: data.length,
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
            <div className="grid grid-cols-4 gap-6 min-h-[300px]">
                 <DonutChart 
                    title="Report by Case Category" 
                    data={caseCategoryData} 
                    onViewDetail={() => handleViewDetail('Report by Case Category', caseCategoryData, 'pie')}
                />
                <HorizontalBarChart 
                    title="Branch Report" 
                    data={branchData} 
                    onViewDetail={() => handleViewDetail('Branch Report', branchData, 'horizontal_bar')}
                />
                <HorizontalBarChart 
                    title="Airlines Report" 
                    data={airlinesData} 
                    onViewDetail={() => handleViewDetail('Airlines Report', airlinesData, 'horizontal_bar')}
                />
                <HorizontalBarChart 
                    title="Monthly Report" 
                    data={monthlyData} 
                    onViewDetail={() => handleViewDetail('Monthly Report', monthlyData, 'horizontal_bar')}
                />
            </div>

            {/* ROW 2: Mixed - NOW 3 EQUAL COLUMNS */}
            <div className="grid grid-cols-3 gap-6 min-h-[300px]">
                 <DonutChart 
                    title="Category by Area" 
                    data={areaCategoryData} 
                    onViewDetail={() => handleViewDetail('Category by Area', areaCategoryData, 'pie')}
                 />
                 <HeatmapChart 
                    title="Case Category by Branch" 
                    data={flattenBranchData} 
                    xAxis="category" 
                    yAxis="branch" 
                    metric="count"
                    onViewDetail={() => handleViewDetail('Case Category by Branch', flattenBranchData, 'heatmap', {
                        xAxis: 'category',
                        yAxis: ['branch'],
                        metric: 'count'
                    })}
                 />
                 
                 <HeatmapChart 
                    title="Case Category by Airlines" 
                    data={flattenAirlineData}
                    xAxis="category" 
                    yAxis="airline" 
                    metric="count"
                    onViewDetail={() => handleViewDetail('Case Category by Airlines', flattenAirlineData, 'heatmap', {
                        xAxis: 'category',
                        yAxis: ['airline'],
                        metric: 'count'
                    })}
                 />
            </div>
        </div>
    );
}
