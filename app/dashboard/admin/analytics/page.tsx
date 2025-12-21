'use client';

import { useEffect, useState, useRef } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    BarChart3, TrendingUp, RefreshCw, Building2,
    AlertTriangle, CheckCircle2, Clock, Activity, Target,
    FileSpreadsheet, FileText, ChevronDown, Filter, Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AnalyticsData {
    stationData: Array<{ station: string; total: number; resolved: number; pending: number; reviewed: number; high: number; medium: number; low: number; resolutionRate: number }>;
    divisionData: Array<{ division: string; total: number; resolved: number; pending: number; high: number; resolutionRate: number }>;
    trendData: Array<{ month: string; total: number; resolved: number; high: number }>;
    severityData: Array<{ name: string; value: number; color: string }>;
    statusData: Array<{ name: string; value: number; color: string }>;
    incidentData: Array<{ name: string; value: number }>;
    stations: Array<{ code: string; name: string }>;
    summary: {
        totalReports: number;
        resolvedReports: number;
        pendingReports: number;
        highSeverity: number;
        avgResolutionRate: number;
        stationCount: number;
    };
}

// OKLCH-inspired colors for charts
const CHART_COLORS = {
    primary: '#2e8b57',    // Emerald
    secondary: '#3b82f6',  // Blue
    warning: '#f59e0b',    // Amber
    danger: '#ef4444',     // Red
    success: '#10b981',    // Green
    purple: '#8b5cf6',     // Purple
    cyan: '#06b6d4',       // Cyan
    pink: '#ec4899',       // Pink
};

export default function AnalyticsDashboard() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeChart, setActiveChart] = useState<'bar' | 'stacked'>('bar');
    const [selectedStation, setSelectedStation] = useState<string>('all');
    const [exportLoading, setExportLoading] = useState(false);
    const dashboardRef = useRef<HTMLDivElement>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/analytics');
            const result = await res.json();
            setData(result);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Filter data by selected station
    const getFilteredData = () => {
        if (!data || selectedStation === 'all') return data;

        const stationInfo = data.stationData.find(s => s.station === selectedStation);
        if (!stationInfo) {
            return {
                ...data,
                stationData: [{
                    station: selectedStation,
                    total: 0, resolved: 0, pending: 0, reviewed: 0,
                    high: 0, medium: 0, low: 0, resolutionRate: 0
                }],
                summary: {
                    totalReports: 0, resolvedReports: 0, pendingReports: 0,
                    highSeverity: 0, avgResolutionRate: 0, stationCount: 1
                }
            };
        }

        return {
            ...data,
            stationData: [stationInfo],
            summary: {
                totalReports: stationInfo.total,
                resolvedReports: stationInfo.resolved,
                pendingReports: stationInfo.pending,
                highSeverity: stationInfo.high,
                avgResolutionRate: stationInfo.resolutionRate,
                stationCount: 1
            }
        };
    };

    const filteredData = getFilteredData();

    // Export functions (preserved from original)
    const exportToExcel = () => {
        if (!data) return;
        setExportLoading(true);
        try {
            const wb = XLSX.utils.book_new();
            const summaryData = [
                ['GAPURA ANGKASA - ANALYTICS REPORT'],
                ['Generated:', new Date().toLocaleString('id-ID')],
                [''],
                ['RINGKASAN KESELURUHAN'],
                ['Total Laporan', data.summary.totalReports],
                ['Laporan Selesai', data.summary.resolvedReports],
                ['Laporan Pending', data.summary.pendingReports],
                ['High Priority', data.summary.highSeverity],
                ['Resolution Rate', `${data.summary.avgResolutionRate}%`],
            ];
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            const stationHeaders = ['Station', 'Total', 'Selesai', 'Pending', 'High', 'Medium', 'Low', 'Rate (%)'];
            const stationRows = data.stationData.map(s => [s.station, s.total, s.resolved, s.pending, s.high, s.medium, s.low, s.resolutionRate]);
            const wsStation = XLSX.utils.aoa_to_sheet([stationHeaders, ...stationRows]);
            XLSX.utils.book_append_sheet(wb, wsStation, 'Per Station');
            
            // Add Division Sheet
            if (data.divisionData) {
                const divisionHeaders = ['Division', 'Total', 'Selesai', 'Pending', 'High', 'Rate (%)'];
                const divisionRows = data.divisionData.map(d => [d.division, d.total, d.resolved, d.pending, d.high, d.resolutionRate]);
                const wsDivision = XLSX.utils.aoa_to_sheet([divisionHeaders, ...divisionRows]);
                XLSX.utils.book_append_sheet(wb, wsDivision, 'Per Divisi');
            }

            XLSX.writeFile(wb, `Gapura_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error('Export error:', error);
        } finally {
            setExportLoading(false);
        }
    };

    const exportToPDF = async () => {
        if (!data) return;
        setExportLoading(true);
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();

            pdf.setFillColor(46, 139, 87);
            pdf.rect(0, 0, pageWidth, 35, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            pdf.text('GAPURA ANGKASA', 15, 16);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Analytics Report', 15, 24);
            pdf.setFontSize(9);
            pdf.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 15, 31);

            pdf.setTextColor(0, 0, 0);
            let yPos = 50;

            pdf.text('Performa Per Station', 15, 45);
            autoTable(pdf, {
                startY: yPos,
                head: [['Station', 'Total', 'Selesai', 'Pending', 'High', 'Rate']],
                body: data.stationData.map(s => [s.station, s.total, s.resolved, s.pending, s.high, `${s.resolutionRate}%`]),
                theme: 'striped',
                headStyles: { fillColor: [46, 139, 87], fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                margin: { left: 15, right: 15 },
            });

            // Add Division Table
             if (data.divisionData && data.divisionData.length > 0) {
                const lastY = (pdf as any).lastAutoTable.finalY || 150;
                yPos = lastY + 20;

                pdf.text('Performa Per Divisi', 15, yPos - 5);
                autoTable(pdf, {
                    startY: yPos,
                    head: [['Divisi', 'Total', 'Selesai', 'Pending', 'High', 'Rate']],
                    body: data.divisionData.map(d => [d.division, d.total, d.resolved, d.pending, d.high, `${d.resolutionRate}%`]),
                    theme: 'striped',
                    headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
                    bodyStyles: { fontSize: 8 },
                    margin: { left: 15, right: 15 },
                });
            }

            pdf.save(`Gapura_Analytics_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('PDF Export error:', error);
        } finally {
            setExportLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div 
                    className="w-12 h-12 rounded-full border-4 animate-spin"
                    style={{ borderColor: 'var(--surface-4)', borderTopColor: 'var(--brand-primary)' }}
                />
            </div>
        );
    }

    if (!data || !filteredData) return <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Gagal memuat data</div>;

    const maxLocation = Math.max(...(data.stationData.map(s => s.total) || [1]));

    return (
        <div className="space-y-8 stagger-children" ref={dashboardRef}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in-up">
                <div>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Analitik</h1>
                    <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Business Intelligence & Data Analytics</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Station Filter */}
                    <div className="relative">
                        <select
                            value={selectedStation}
                            onChange={(e) => setSelectedStation(e.target.value)}
                            className="input-field pl-10 pr-10 py-2.5 min-w-[180px] cursor-pointer"
                            style={{ background: 'var(--surface-2)' }}
                        >
                            <option value="all">Semua Station</option>
                            {data.stations?.map((s) => (
                                <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                            ))}
                        </select>
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <button onClick={exportToExcel} disabled={exportLoading} className="btn-secondary" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                        <FileSpreadsheet size={16} /> Excel
                    </button>
                    <button onClick={exportToPDF} disabled={exportLoading} className="btn-secondary" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                        <FileText size={16} /> PDF
                    </button>
                    <button onClick={fetchData} className="btn-secondary" style={{ padding: 'var(--space-sm)' }}>
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Station Filter Banner */}
            {selectedStation !== 'all' && (
                <div 
                    className="card-solid flex items-center justify-between animate-fade-in-up"
                    style={{ 
                        background: 'linear-gradient(135deg, var(--brand-gradient-start), var(--brand-gradient-end))',
                        padding: 'var(--space-lg)'
                    }}
                >
                    <div className="flex items-center gap-3">
                        <Building2 size={24} className="text-white" />
                        <div>
                            <p className="font-bold text-white">Station: {selectedStation}</p>
                            <p className="text-sm text-white/70">Filter aktif</p>
                        </div>
                    </div>
                    <button onClick={() => setSelectedStation('all')} className="px-4 py-2 bg-white/20 rounded-xl text-sm font-medium text-white hover:bg-white/30 transition-colors">
                        Reset
                    </button>
                </div>
            )}

            {/* KPI Cards — Bento Grid */}
            <div className="bento-grid bento-3">
                {/* Hero: Resolution Rate */}
                <div 
                    className="card-solid bento-span-2 row-span-2 animate-fade-in-up"
                    style={{ 
                        background: 'linear-gradient(135deg, var(--brand-gradient-start), var(--brand-gradient-end))',
                        boxShadow: 'var(--shadow-brand)'
                    }}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium uppercase tracking-wider text-white/70">Resolution Rate</p>
                            <p className="mt-3 font-bold text-white" style={{ fontSize: 'clamp(4rem, 10vw, 6rem)', lineHeight: 1, letterSpacing: '-0.03em' }}>
                                {filteredData.summary.avgResolutionRate}%
                            </p>
                            <p className="mt-4 text-sm text-white/80">
                                {filteredData.summary.resolvedReports} dari {filteredData.summary.totalReports} laporan terselesaikan
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/15">
                            <Target size={32} className="text-white" />
                        </div>
                    </div>
                </div>

                {/* Total */}
                <div className="card-solid animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                    <Activity size={22} style={{ color: 'var(--accent-primary)' }} />
                    <p className="text-3xl font-bold mt-3" style={{ color: 'var(--text-primary)' }}>{filteredData.summary.totalReports}</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Total Laporan</p>
                </div>

                {/* Resolved */}
                <div className="card-solid animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <CheckCircle2 size={22} style={{ color: 'var(--status-success)' }} />
                    <p className="text-3xl font-bold mt-3" style={{ color: 'var(--text-primary)' }}>{filteredData.summary.resolvedReports}</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Selesai</p>
                </div>

                {/* Pending */}
                <div className="card-solid animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                    <Clock size={22} style={{ color: 'var(--status-warning)' }} />
                    <p className="text-3xl font-bold mt-3" style={{ color: 'var(--text-primary)' }}>{filteredData.summary.pendingReports}</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Menunggu</p>
                </div>

                {/* High Priority */}
                <div className="card-solid animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <AlertTriangle size={22} style={{ color: 'var(--status-error)' }} />
                    <p className="text-3xl font-bold mt-3" style={{ color: 'var(--text-primary)' }}>{filteredData.summary.highSeverity}</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>High Priority</p>
                </div>

                {/* Stations */}
                <div className="card-solid animate-fade-in-up" style={{ animationDelay: '250ms' }}>
                    <Building2 size={22} style={{ color: 'var(--accent-primary)' }} />
                    <p className="text-3xl font-bold mt-3" style={{ color: 'var(--text-primary)' }}>{data.summary.stationCount}</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Stations</p>
                </div>
            </div>

            {/* Division Performance Charts (New Section) */}
            <div className="bento-grid bento-2">
                 <div className="card-solid animate-fade-in-up" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="flex items-center gap-3" style={{ padding: 'var(--space-xl)', borderBottom: '1px solid var(--surface-4)' }}>
                        <div className="p-3 rounded-xl" style={{ background: 'oklch(0.55 0.12 250 / 0.15)' }}>
                            <Layers size={20} style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <div>
                            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Peforma Divisi</h3>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total laporan per divisi</p>
                        </div>
                    </div>
                    <div style={{ padding: 'var(--space-lg)' }}>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={data.divisionData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-4)" vertical={false} />
                                <XAxis dataKey="division" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--surface-4)', boxShadow: 'var(--shadow-md)' }} />
                                <Bar dataKey="total" name="Total Laporan" fill={CHART_COLORS.purple} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                 <div className="card-solid animate-fade-in-up" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="flex items-center gap-3" style={{ padding: 'var(--space-xl)', borderBottom: '1px solid var(--surface-4)' }}>
                        <div className="p-3 rounded-xl" style={{ background: 'oklch(0.55 0.12 250 / 0.15)' }}>
                            <Target size={20} style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <div>
                            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Resolution Rate Divisi</h3>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tingkat penyelesaian %</p>
                        </div>
                    </div>
                    <div style={{ padding: 'var(--space-lg)' }}>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={data.divisionData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-4)" vertical={false} />
                                <XAxis dataKey="division" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--surface-4)', boxShadow: 'var(--shadow-md)' }} />
                                <Bar dataKey="resolutionRate" name="Resolution %" fill={CHART_COLORS.cyan} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Station Performance Chart */}
            <div className="card-solid animate-fade-in-up" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="flex items-center justify-between" style={{ padding: 'var(--space-xl)', borderBottom: '1px solid var(--surface-4)' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl" style={{ background: 'oklch(0.55 0.12 250 / 0.15)' }}>
                            <Building2 size={20} style={{ color: 'oklch(0.50 0.12 250)' }} />
                        </div>
                        <div>
                            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Performa Per Station</h3>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Jumlah irregularity per cabang</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setActiveChart('bar')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeChart === 'bar' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                            Status
                        </button>
                        <button onClick={() => setActiveChart('stacked')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeChart === 'stacked' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                            Severity
                        </button>
                    </div>
                </div>
                <div style={{ padding: 'var(--space-lg)' }}>
                    <ResponsiveContainer width="100%" height={320}>
                        {activeChart === 'bar' ? (
                            <BarChart data={filteredData.stationData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-4)" vertical={false} />
                                <XAxis dataKey="station" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--surface-4)', boxShadow: 'var(--shadow-md)' }} />
                                <Bar dataKey="total" name="Total" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="resolved" name="Selesai" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="pending" name="Pending" fill={CHART_COLORS.warning} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        ) : (
                            <BarChart data={filteredData.stationData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-4)" vertical={false} />
                                <XAxis dataKey="station" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--surface-4)', boxShadow: 'var(--shadow-md)' }} />
                                <Bar dataKey="high" name="High" stackId="severity" fill={CHART_COLORS.danger} />
                                <Bar dataKey="medium" name="Medium" stackId="severity" fill={CHART_COLORS.warning} />
                                <Bar dataKey="low" name="Low" stackId="severity" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Row: Trend + Distribution */}
            <div className="bento-grid bento-2">
                {/* Trend Chart */}
                <div className="card-solid animate-fade-in-up" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="flex items-center gap-3" style={{ padding: 'var(--space-xl)', borderBottom: '1px solid var(--surface-4)' }}>
                        <div className="p-3 rounded-xl" style={{ background: 'oklch(0.55 0.14 160 / 0.15)' }}>
                            <TrendingUp size={20} style={{ color: 'var(--status-success)' }} />
                        </div>
                        <div>
                            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Tren Bulanan</h3>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>6 bulan terakhir</p>
                        </div>
                    </div>
                    <div style={{ padding: 'var(--space-lg)' }}>
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={data.trendData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.2} />
                                        <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.2} />
                                        <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-4)" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--surface-4)', boxShadow: 'var(--shadow-md)' }} />
                                <Area type="monotone" dataKey="total" name="Total" stroke={CHART_COLORS.secondary} fill="url(#colorTotal)" strokeWidth={2} />
                                <Area type="monotone" dataKey="resolved" name="Selesai" stroke={CHART_COLORS.success} fill="url(#colorResolved)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribution Pie Charts */}
                <div className="card-solid animate-fade-in-up" style={{ animationDelay: '50ms', padding: 0, overflow: 'hidden' }}>
                    <div className="flex items-center gap-3" style={{ padding: 'var(--space-xl)', borderBottom: '1px solid var(--surface-4)' }}>
                        <div className="p-3 rounded-xl" style={{ background: 'oklch(0.55 0.12 250 / 0.15)' }}>
                            <BarChart3 size={20} style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <div>
                            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Distribusi</h3>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Severity & Status</p>
                        </div>
                    </div>
                    <div style={{ padding: 'var(--space-lg)' }}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-center mb-2" style={{ color: 'var(--text-muted)' }}>Severity</p>
                                <ResponsiveContainer width="100%" height={160}>
                                    <PieChart>
                                        <Pie data={data.severityData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={4} dataKey="value">
                                            {data.severityData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--surface-4)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap justify-center gap-2 mt-2 text-xs">
                                    {data.severityData.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                                            <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-center mb-2" style={{ color: 'var(--text-muted)' }}>Status</p>
                                <ResponsiveContainer width="100%" height={160}>
                                    <PieChart>
                                        <Pie data={data.statusData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={4} dataKey="value">
                                            {data.statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--surface-4)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap justify-center gap-2 mt-2 text-xs">
                                    {data.statusData.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                                            <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Station Table */}
            <div className="card-solid animate-fade-in-up" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="flex items-center gap-3" style={{ padding: 'var(--space-xl)', borderBottom: '1px solid var(--surface-4)' }}>
                    <div className="p-3 rounded-xl" style={{ background: 'oklch(0.55 0.12 250 / 0.15)' }}>
                        <BarChart3 size={20} style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <div>
                        <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Tabel Performa Station</h3>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Klik baris untuk filter</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--surface-4)' }}>
                                <th className="text-left py-4 px-6 font-semibold" style={{ color: 'var(--text-muted)' }}>Station</th>
                                <th className="text-center py-4 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}>Total</th>
                                <th className="text-center py-4 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}>Selesai</th>
                                <th className="text-center py-4 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}>High</th>
                                <th className="text-left py-4 px-4 font-semibold" style={{ color: 'var(--text-muted)' }}>Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.stationData.slice(0, 10).map((station, idx) => (
                                <tr
                                    key={idx}
                                    onClick={() => setSelectedStation(station.station)}
                                    className="cursor-pointer transition-colors"
                                    style={{ 
                                        borderBottom: '1px solid var(--surface-4)',
                                        background: selectedStation === station.station ? 'var(--surface-3)' : 'transparent'
                                    }}
                                    onMouseEnter={(e) => { if (selectedStation !== station.station) e.currentTarget.style.background = 'var(--surface-3)'; }}
                                    onMouseLeave={(e) => { if (selectedStation !== station.station) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <td className="py-4 px-6 font-bold" style={{ color: 'var(--text-primary)' }}>{station.station}</td>
                                    <td className="py-4 px-4 text-center" style={{ color: 'var(--text-secondary)' }}>{station.total}</td>
                                    <td className="py-4 px-4 text-center" style={{ color: 'var(--status-success)' }}>{station.resolved}</td>
                                    <td className="py-4 px-4 text-center" style={{ color: 'var(--status-error)' }}>{station.high}</td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-4)', maxWidth: '80px' }}>
                                                <div 
                                                    className="h-full rounded-full" 
                                                    style={{ 
                                                        width: `${station.resolutionRate}%`,
                                                        background: station.resolutionRate >= 70 ? 'var(--status-success)' :
                                                                   station.resolutionRate >= 40 ? 'var(--status-warning)' :
                                                                   'var(--status-error)'
                                                    }}
                                                />
                                            </div>
                                            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{station.resolutionRate}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
