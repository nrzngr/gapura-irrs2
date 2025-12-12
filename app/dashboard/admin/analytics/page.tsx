'use client';

import { useEffect, useState, useRef } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
    BarChart3, PieChart as PieChartIcon, TrendingUp, RefreshCw, Building2,
    AlertTriangle, CheckCircle2, Clock, Activity, Target, Zap, Download,
    FileSpreadsheet, FileText, ChevronDown, Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AnalyticsData {
    stationData: Array<{ station: string; total: number; resolved: number; pending: number; reviewed: number; high: number; medium: number; low: number; resolutionRate: number }>;
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

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
                    total: 0,
                    resolved: 0,
                    pending: 0,
                    reviewed: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                    resolutionRate: 0
                }],
                summary: {
                    totalReports: 0,
                    resolvedReports: 0,
                    pendingReports: 0,
                    highSeverity: 0,
                    avgResolutionRate: 0,
                    stationCount: 1
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

    // Export to Excel
    const exportToExcel = () => {
        if (!data) return;
        setExportLoading(true);

        try {
            const wb = XLSX.utils.book_new();

            // Summary Sheet
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
                ['Jumlah Station', data.summary.stationCount],
            ];
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            // Station Data Sheet
            const stationHeaders = ['Station', 'Total', 'Selesai', 'Pending', 'Ditinjau', 'High', 'Medium', 'Low', 'Resolution Rate (%)'];
            const stationRows = data.stationData.map(s => [s.station, s.total, s.resolved, s.pending, s.reviewed || 0, s.high, s.medium, s.low, s.resolutionRate]);
            const wsStation = XLSX.utils.aoa_to_sheet([stationHeaders, ...stationRows]);
            XLSX.utils.book_append_sheet(wb, wsStation, 'Per Station');

            // Monthly Trend Sheet
            const trendHeaders = ['Bulan', 'Total', 'Selesai', 'High Priority'];
            const trendRows = data.trendData.map(t => [t.month, t.total, t.resolved, t.high]);
            const wsTrend = XLSX.utils.aoa_to_sheet([trendHeaders, ...trendRows]);
            XLSX.utils.book_append_sheet(wb, wsTrend, 'Tren Bulanan');

            // Incident Types Sheet
            const incidentHeaders = ['Tipe Insiden', 'Jumlah'];
            const incidentRows = data.incidentData.map(i => [i.name, i.value]);
            const wsIncident = XLSX.utils.aoa_to_sheet([incidentHeaders, ...incidentRows]);
            XLSX.utils.book_append_sheet(wb, wsIncident, 'Tipe Insiden');

            XLSX.writeFile(wb, `Gapura_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error('Export error:', error);
            alert('Gagal export ke Excel');
        } finally {
            setExportLoading(false);
        }
    };

    // Export to PDF
    const exportToPDF = async () => {
        if (!data) return;
        setExportLoading(true);

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();

            // Header with logo placeholder
            pdf.setFillColor(30, 58, 138); // Dark blue
            pdf.rect(0, 0, pageWidth, 40, 'F');

            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(24);
            pdf.setFont('helvetica', 'bold');
            pdf.text('GAPURA ANGKASA', 15, 18);

            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Analytics & Business Intelligence Report', 15, 28);

            pdf.setFontSize(10);
            pdf.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 15, 36);

            // Reset text color
            pdf.setTextColor(0, 0, 0);

            // Summary Section
            let yPos = 55;
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text('RINGKASAN KESELURUHAN', 15, yPos);

            yPos += 10;
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');

            // KPI Grid
            const kpiData = [
                ['Total Laporan', data.summary.totalReports.toString()],
                ['Laporan Selesai', data.summary.resolvedReports.toString()],
                ['Laporan Pending', data.summary.pendingReports.toString()],
                ['High Priority', data.summary.highSeverity.toString()],
                ['Resolution Rate', `${data.summary.avgResolutionRate}%`],
                ['Jumlah Station', data.summary.stationCount.toString()],
            ];

            // Draw KPI boxes
            const boxWidth = 55;
            const boxHeight = 20;
            let xPos = 15;
            kpiData.forEach((kpi, idx) => {
                if (idx % 3 === 0 && idx !== 0) {
                    xPos = 15;
                    yPos += boxHeight + 5;
                }

                pdf.setFillColor(248, 250, 252);
                pdf.roundedRect(xPos, yPos, boxWidth, boxHeight, 3, 3, 'F');

                pdf.setFontSize(8);
                pdf.setTextColor(100, 116, 139);
                pdf.text(kpi[0], xPos + 5, yPos + 8);

                pdf.setFontSize(14);
                pdf.setTextColor(15, 23, 42);
                pdf.setFont('helvetica', 'bold');
                pdf.text(kpi[1], xPos + 5, yPos + 16);
                pdf.setFont('helvetica', 'normal');

                xPos += boxWidth + 5;
            });

            // Station Performance Table
            yPos += boxHeight + 20;
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text('PERFORMA PER STATION', 15, yPos);

            autoTable(pdf, {
                startY: yPos + 5,
                head: [['Station', 'Total', 'Selesai', 'Pending', 'High', 'Medium', 'Low', 'Rate']],
                body: data.stationData.map(s => [
                    s.station, s.total, s.resolved, s.pending, s.high, s.medium, s.low, `${s.resolutionRate}%`
                ]),
                theme: 'striped',
                headStyles: { fillColor: [30, 58, 138], fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 15, right: 15 },
            });

            // Monthly Trend Table
            // @ts-ignore
            yPos = pdf.lastAutoTable.finalY + 15;

            if (yPos > 250) {
                pdf.addPage();
                yPos = 20;
            }

            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text('TREN BULANAN (6 BULAN TERAKHIR)', 15, yPos);

            autoTable(pdf, {
                startY: yPos + 5,
                head: [['Bulan', 'Total Laporan', 'Selesai', 'High Priority']],
                body: data.trendData.map(t => [t.month, t.total, t.resolved, t.high]),
                theme: 'striped',
                headStyles: { fillColor: [30, 58, 138], fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 15, right: 15 },
            });

            // Top Incident Types
            // @ts-ignore
            yPos = pdf.lastAutoTable.finalY + 15;

            if (yPos > 250) {
                pdf.addPage();
                yPos = 20;
            }

            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text('TOP TIPE INSIDEN', 15, yPos);

            autoTable(pdf, {
                startY: yPos + 5,
                head: [['Tipe Insiden', 'Jumlah Kasus']],
                body: data.incidentData.map(i => [i.name, i.value]),
                theme: 'striped',
                headStyles: { fillColor: [30, 58, 138], fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 15, right: 15 },
            });

            // Footer
            // @ts-ignore
            const pageCount = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                pdf.setPage(i);
                pdf.setFontSize(8);
                pdf.setTextColor(100, 116, 139);
                pdf.text(
                    `Halaman ${i} dari ${pageCount} | Gapura Angkasa - Confidential`,
                    pageWidth / 2,
                    pdf.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }

            pdf.save(`Gapura_Analytics_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('PDF Export error:', error);
            alert('Gagal export ke PDF');
        } finally {
            setExportLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6" />
                    <p className="text-slate-500 font-medium">Memuat data analytics...</p>
                </div>
            </div>
        );
    }

    if (!data || !filteredData) return <div className="text-center py-12 text-slate-500">Gagal memuat data</div>;

    return (
        <div className="space-y-6" ref={dashboardRef}>
            {/* Header */}
            <div className="space-y-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
                    <p className="text-slate-500 mt-1 text-sm sm:text-base">Business Intelligence & Real-time Data Analytics</p>
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {/* Station Filter */}
                    <div className="relative w-full sm:w-auto">
                        <select
                            value={selectedStation}
                            onChange={(e) => setSelectedStation(e.target.value)}
                            className="w-full sm:w-auto appearance-none pl-10 pr-10 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-medium focus:border-blue-500 focus:outline-none cursor-pointer text-sm"
                        >
                            <option value="all">Semua Station</option>
                            {data.stations?.map((s) => (
                                <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                            ))}
                        </select>
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>

                    {/* Export Buttons & Refresh */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={exportToExcel}
                            disabled={exportLoading}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-medium text-xs sm:text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50"
                        >
                            <FileSpreadsheet size={16} />
                            <span>Export Excel</span>
                        </button>
                        <button
                            onClick={exportToPDF}
                            disabled={exportLoading}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium text-xs sm:text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                            <FileText size={16} />
                            <span>Export PDF</span>
                        </button>
                        <button
                            onClick={fetchData}
                            className="p-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                            title="Refresh Data"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Selected Station Banner */}
            {selectedStation !== 'all' && (
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Building2 size={24} />
                        <div>
                            <p className="font-bold">Menampilkan data untuk Station: {selectedStation}</p>
                            <p className="text-blue-100 text-sm">Filter aktif - menampilkan analytics khusus cabang ini</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedStation('all')}
                        className="px-4 py-2 bg-white/20 rounded-xl text-sm font-medium hover:bg-white/30 transition-colors"
                    >
                        Reset Filter
                    </button>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
                    <Activity size={24} className="mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{filteredData.summary.totalReports}</p>
                    <p className="text-blue-100 text-sm">Total Laporan</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white">
                    <CheckCircle2 size={24} className="mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{filteredData.summary.resolvedReports}</p>
                    <p className="text-emerald-100 text-sm">Selesai</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white">
                    <Clock size={24} className="mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{filteredData.summary.pendingReports}</p>
                    <p className="text-amber-100 text-sm">Menunggu</p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 text-white">
                    <AlertTriangle size={24} className="mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{filteredData.summary.highSeverity}</p>
                    <p className="text-red-100 text-sm">High Priority</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white">
                    <Target size={24} className="mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{filteredData.summary.avgResolutionRate}%</p>
                    <p className="text-purple-100 text-sm">Resolution Rate</p>
                </div>
                <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl p-4 text-white">
                    <Building2 size={24} className="mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{filteredData.summary.stationCount}</p>
                    <p className="text-cyan-100 text-sm">Stations</p>
                </div>
            </div>

            {/* Station Performance Chart */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-xl">
                            <Building2 size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Performa Per Station</h3>
                            <p className="text-sm text-slate-500">Jumlah irregularity dan penyelesaian per cabang</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveChart('bar')}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeChart === 'bar' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Status View
                        </button>
                        <button
                            onClick={() => setActiveChart('stacked')}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeChart === 'stacked' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Severity View
                        </button>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                    {activeChart === 'bar' ? (
                        <BarChart data={filteredData.stationData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="station" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <Legend />
                            <Bar dataKey="total" name="Total Laporan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="resolved" name="Selesai" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    ) : (
                        <BarChart data={filteredData.stationData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="station" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <Legend />
                            <Bar dataKey="high" name="High Severity" stackId="severity" fill="#ef4444" />
                            <Bar dataKey="medium" name="Medium Severity" stackId="severity" fill="#f59e0b" />
                            <Bar dataKey="low" name="Low Severity" stackId="severity" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-100 rounded-xl">
                            <TrendingUp size={20} className="text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Tren Bulanan</h3>
                            <p className="text-sm text-slate-500">6 bulan terakhir</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={data.trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <Legend />
                            <Area type="monotone" dataKey="total" name="Total Laporan" stroke="#3b82f6" fill="url(#colorTotal)" strokeWidth={2} />
                            <Area type="monotone" dataKey="resolved" name="Selesai" stroke="#10b981" fill="url(#colorResolved)" strokeWidth={2} />
                            <Line type="monotone" dataKey="high" name="High Priority" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Severity & Status Distribution */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-100 rounded-xl">
                            <PieChartIcon size={20} className="text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Distribusi</h3>
                            <p className="text-sm text-slate-500">Severity & Status</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-slate-500 text-center mb-2 font-medium">SEVERITY</p>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={data.severityData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data.severityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs px-2">
                                {data.severityData.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-1 whitespace-nowrap">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                                        <span className="text-slate-600">{item.name}: {item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 text-center mb-2 font-medium">STATUS</p>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={data.statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data.statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs px-2">
                                {data.statusData.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-1 whitespace-nowrap">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                                        <span className="text-slate-600">{item.name}: {item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Incident Type & Station Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Incident Types */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-amber-100 rounded-xl">
                            <Zap size={20} className="text-amber-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Top Tipe Insiden</h3>
                            <p className="text-sm text-slate-500">8 tipe insiden terbanyak</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={data.incidentData} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={95} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <Bar dataKey="value" name="Jumlah Kasus" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Station Performance Table */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-cyan-100 rounded-xl">
                            <BarChart3 size={20} className="text-cyan-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Tabel Performa Station</h3>
                            <p className="text-sm text-slate-500">Resolution rate per cabang</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left py-3 px-2 text-slate-500 font-medium">Station</th>
                                    <th className="text-center py-3 px-2 text-slate-500 font-medium">Total</th>
                                    <th className="text-center py-3 px-2 text-slate-500 font-medium">Selesai</th>
                                    <th className="text-center py-3 px-2 text-slate-500 font-medium">Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.stationData.slice(0, 10).map((station, idx) => (
                                    <tr
                                        key={idx}
                                        className={`border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${selectedStation === station.station ? 'bg-blue-50' : ''}`}
                                        onClick={() => setSelectedStation(station.station)}
                                    >
                                        <td className="py-3 px-2 font-semibold text-slate-900">{station.station}</td>
                                        <td className="py-3 px-2 text-center">{station.total}</td>
                                        <td className="py-3 px-2 text-center text-emerald-600">{station.resolved}</td>
                                        <td className="py-3 px-2 text-center">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${station.resolutionRate >= 70 ? 'bg-emerald-100 text-emerald-700' : station.resolutionRate >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                {station.resolutionRate}%
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
