'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    ArrowLeft, Calendar, Filter, Download, RefreshCw, Layers, 
    AlertTriangle, CheckCircle2, Clock, Activity, Building2, 
    TrendingUp, PieChart as PieChartIcon
} from 'lucide-react';
import { NoiseTexture } from '@/components/ui/NoiseTexture';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG } from '@/lib/constants/report-status';

interface AnalyticsData {
    summary: {
        totalReports: number;
        resolvedReports: number;
        pendingReports: number;
        highSeverity: number;
        avgResolutionRate: number;
        stationCount: number;
    };
    stationData: Array<{ station: string; total: number; resolved: number; resolutionRate: number }>;
    divisionData: Array<{ division: string; total: number; resolved: number; pending: number; high: number }>;
    trendData: Array<{ month: string; total: number; resolved: number; high: number }>;
    statusData: Array<{ name: string; value: number; color: string }>;
    incidentData: Array<{ name: string; value: number }>;
}

export default function OSAnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/analytics');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
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
                <div className="bg-white/95 backdrop-blur-md p-3 border border-gray-200 rounded-xl shadow-xl z-50">
                    <p className="text-xs font-bold text-gray-900 mb-2">{label}</p>
                    {payload.map((entry: any, idx: number) => (
                        <p key={idx} className="text-xs flex items-center gap-2" style={{ color: entry.color || entry.payload.fill }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: entry.color || entry.payload.fill }} />
                            <span>{entry.name}:</span>
                            <span className="font-bold">{entry.value}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--surface-1)]">
                <div className="w-10 h-10 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--surface-1)]">
            {/* Header */}
            <div className="bg-white border-b border-[var(--surface-4)] sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link 
                                href="/dashboard/os"
                                className="p-2 -ml-2 rounded-full hover:bg-[var(--surface-2)] transition-colors"
                            >
                                <ArrowLeft size={20} className="text-[var(--text-secondary)]" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                                    Analytics & Performance
                                </h1>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    Deep dive into operational metrics
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={fetchData}
                            className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-secondary)] transition-colors"
                        >
                            <RefreshCw size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 stagger-children">
                
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
                    <StatCard 
                        label="Total Reports" 
                        value={data?.summary.totalReports || 0} 
                        icon={Activity} 
                        color="blue"
                    />
                     <StatCard 
                        label="Resolution Rate" 
                        value={`${data?.summary.avgResolutionRate || 0}%`} 
                        icon={CheckCircle2} 
                        color="emerald"
                    />
                     <StatCard 
                        label="Pending" 
                        value={data?.summary.pendingReports || 0} 
                        icon={Clock} 
                        color="amber"
                    />
                     <StatCard 
                        label="Generic High Sev" 
                        value={data?.summary.highSeverity || 0} 
                        icon={AlertTriangle} 
                        color="red"
                    />
                </div>

                {/* Main Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    {/* Trend Chart */}
                    <div className="lg:col-span-2 card-solid p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Monthly Trend</h3>
                                <p className="text-xs text-[var(--text-muted)]">Report volume over time</p>
                            </div>
                            <TrendingUp size={20} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data?.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-4)" />
                                    <XAxis dataKey="month" tick={{fill: '#9ca3af', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fill: '#9ca3af', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Area type="monotone" dataKey="total" name="Total" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" fillOpacity={1} fill="url(#colorResolved)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Status Distribution */}
                    <div className="card-solid p-6">
                         <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Status Mix</h3>
                                <p className="text-xs text-[var(--text-muted)]">Current breakdown</p>
                            </div>
                            <PieChartIcon size={20} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="h-[300px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data?.statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                        cornerRadius={4}
                                    >
                                        {data?.statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Secondary Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    
                    {/* Incident Types */}
                    <div className="card-solid p-6">
                         <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Incident Types</h3>
                                <p className="text-xs text-[var(--text-muted)]">Most common issues</p>
                            </div>
                            <Activity size={20} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.incidentData} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--surface-4)" />
                                    <XAxis type="number" tick={{fill: '#9ca3af', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="name" tick={{fill: '#6b7280', fontSize: 11}} width={100} axisLine={false} tickLine={false} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" name="Count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Division Performance */}
                     <div className="card-solid p-6">
                         <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Division Performance</h3>
                                <p className="text-xs text-[var(--text-muted)]">Reports by division</p>
                            </div>
                            <Layers size={20} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.divisionData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-4)" />
                                    <XAxis dataKey="division" tick={{fill: '#9ca3af', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fill: '#9ca3af', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar dataKey="pending" name="Pending" stackId="a" fill="#f59e0b" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="resolved" name="Resolved" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Station Performance Breakdown */}
                <div className="card-solid p-0 overflow-hidden animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                    <div className="p-6 border-b border-[var(--surface-4)] bg-[var(--surface-2)] flex justify-between items-center">
                        <div>
                             <h3 className="font-bold text-lg text-[var(--text-primary)]">Station Performance</h3>
                             <p className="text-xs text-[var(--text-muted)]">Performance across all stations</p>
                        </div>
                        <Building2 size={20} className="text-[var(--text-muted)]" />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--surface-3)]">
                                <tr>
                                    <th className="text-left py-3 px-6 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)]">Station</th>
                                    <th className="text-right py-3 px-6 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)]">Total Reports</th>
                                    <th className="text-right py-3 px-6 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)]">Resolved</th>
                                    <th className="text-right py-3 px-6 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)]">Efficiency</th>
                                    <th className="text-right py-3 px-6 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)]">Health</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--surface-4)]">
                                {data?.stationData.map((s) => (
                                    <tr key={s.station} className="hover:bg-[var(--surface-2)] transition-colors">
                                        <td className="py-4 px-6 font-bold text-[var(--text-primary)]">{s.station}</td>
                                        <td className="py-4 px-6 text-right text-[var(--text-secondary)]">{s.total}</td>
                                        <td className="py-4 px-6 text-right text-emerald-600 font-bold">{s.resolved}</td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="font-mono">{s.resolutionRate}%</span>
                                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div 
                                                        className={cn("h-full rounded-full", 
                                                            s.resolutionRate > 80 ? "bg-emerald-500" : 
                                                            s.resolutionRate > 50 ? "bg-amber-500" : "bg-red-500"
                                                        )}
                                                        style={{ width: `${s.resolutionRate}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                                s.resolutionRate > 80 ? "bg-emerald-100 text-emerald-700" :
                                                s.resolutionRate > 50 ? "bg-amber-100 text-amber-700" :
                                                "bg-red-100 text-red-700"
                                            )}>
                                                {s.resolutionRate > 80 ? "Excellent" : s.resolutionRate > 50 ? "Good" : "Needs Action"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: 'blue' | 'emerald' | 'amber' | 'red' }) {
    const colorMap = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
        red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
    };

    const theme = colorMap[color];

    return (
        <div className={cn("p-5 rounded-2xl bg-white border shadow-sm transition-all hover:shadow-md", theme.border)}>
            <div className="flex items-start justify-between mb-3">
                <div className={cn("p-2.5 rounded-xl", theme.bg)}>
                    <Icon size={20} className={theme.text} />
                </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9ca3af]">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
    );
}
