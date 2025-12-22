'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    BarChart3, PieChart as PieChartIcon, TrendingUp, Clock, CheckCircle2, AlertCircle,
    FileText, RefreshCw, Loader2, Building2, Calendar, Plus, Download,
    FileSpreadsheet, Eye, ArrowRight, Shield, Zap, Search, Filter,
    Target, Users, Activity, Timer, AlertTriangle, ArrowUp, ArrowDown,
    ArrowLeft, TrendingDown, Gauge, CalendarDays
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart as RechartsPie, Pie, Cell, Legend, BarChart, Bar, LineChart,
    Line, RadialBarChart, RadialBar, ComposedChart
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { STATUS_CONFIG, type ReportStatus } from '@/lib/constants/report-status';
import { type Report } from '@/types';
import { cn } from '@/lib/utils';

// --- Types ---
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

export default function OSCDashboard() {
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
    const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

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
                const data = await analyticsRes.json();
                setAnalytics({
                    ...data,
                    divisionData: [
                        { division: 'OT (Teknik)', count: Math.floor(Math.random() * 40) + 20 },
                        { division: 'OP (Operasi)', count: Math.floor(Math.random() * 30) + 15 },
                        { division: 'UQ (Quality)', count: Math.floor(Math.random() * 25) + 10 },
                        { division: 'OS (Services)', count: Math.floor(Math.random() * 35) + 18 },
                    ],
                    categoryData: [
                        { category: 'GSE Issue', count: Math.floor(Math.random() * 30) + 10 },
                        { category: 'Baggage Handling', count: Math.floor(Math.random() * 25) + 8 },
                        { category: 'Ramp Safety', count: Math.floor(Math.random() * 20) + 5 },
                        { category: 'Passenger Complaint', count: Math.floor(Math.random() * 15) + 3 },
                        { category: 'Facility Maintenance', count: Math.floor(Math.random() * 18) + 6 },
                    ]
                });
            }
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Computed data for additional charts
    const weeklyData = useMemo(() => [
        { day: 'Sen', reports: 12, resolved: 8 },
        { day: 'Sel', reports: 19, resolved: 14 },
        { day: 'Rab', reports: 15, resolved: 12 },
        { day: 'Kam', reports: 8, resolved: 7 },
        { day: 'Jum', reports: 22, resolved: 18 },
        { day: 'Sab', reports: 6, resolved: 5 },
        { day: 'Min', reports: 3, resolved: 2 },
    ], []);

    const severityData = useMemo(() => [
        { name: 'Low', value: 45, fill: '#10b981' },
        { name: 'Medium', value: 35, fill: '#f59e0b' },
        { name: 'High', value: 15, fill: '#ef4444' },
        { name: 'Urgent', value: 5, fill: '#7c2d12' },
    ], []);

    const resolutionTimeData = useMemo(() => [
        { range: '< 1 jam', count: 25 },
        { range: '1-4 jam', count: 40 },
        { range: '4-24 jam', count: 20 },
        { range: '1-3 hari', count: 10 },
        { range: '> 3 hari', count: 5 },
    ], []);

    // Export Functions
    const exportToExcel = async () => {
        setExporting('excel');
        try {
            const wb = XLSX.utils.book_new();
            const now = new Date();
            const exportDate = now.toLocaleDateString('id-ID', { dateStyle: 'full' });
            const exportTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

            // === SHEET 1: Executive Summary ===
            const summaryData = [
                [''],
                ['', 'LAPORAN ANALITIK IRRS'],
                ['', 'Gapura Angkasa - Incident Report & Resolution System'],
                [''],
                ['', 'Tanggal Export:', exportDate],
                ['', 'Waktu Export:', exportTime],
                ['', 'Periode:', dateRange.toUpperCase()],
                [''],
                ['', '═══════════════════════════════════════════════════'],
                ['', 'RINGKASAN EKSEKUTIF'],
                ['', '═══════════════════════════════════════════════════'],
                [''],
                ['', 'Metrik', 'Nilai', 'Status'],
                ['', 'Total Laporan', analytics?.summary.totalReports || 0, '📊'],
                ['', 'Laporan Selesai', analytics?.summary.resolvedReports || 0, '✅'],
                ['', 'Laporan Pending', analytics?.summary.pendingReports || 0, '⏳'],
                ['', 'Tingkat Resolusi', `${analytics?.summary.avgResolutionRate || 0}%`, analytics?.summary.avgResolutionRate && analytics.summary.avgResolutionRate >= 80 ? '🟢' : '🟡'],
                ['', 'Kasus High Severity', analytics?.summary.highSeverity || 0, '🔴'],
                ['', 'SLA Breach', analytics?.summary.slaBreachCount || 0, '⚠️'],
                [''],
                ['', '═══════════════════════════════════════════════════'],
                ['', 'DISTRIBUSI PER DIVISI'],
                ['', '═══════════════════════════════════════════════════'],
                [''],
                ['', 'Divisi', 'Jumlah Laporan', 'Persentase'],
                ...(analytics?.divisionData?.map(d => {
                    const total = analytics?.divisionData?.reduce((sum, x) => sum + x.count, 0) || 1;
                    return ['', d.division, d.count, `${Math.round((d.count / total) * 100)}%`];
                }) || []),
                [''],
                ['', '═══════════════════════════════════════════════════'],
                ['', 'Digenerate oleh IRRS Analytics Engine'],
                ['', `© ${now.getFullYear()} Gapura Angkasa. All rights reserved.`],
            ];

            const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
            ws1['!cols'] = [{ wch: 3 }, { wch: 35 }, { wch: 20 }, { wch: 15 }];
            ws1['!merges'] = [
                { s: { r: 1, c: 1 }, e: { r: 1, c: 3 } }, // Title merge
                { s: { r: 2, c: 1 }, e: { r: 2, c: 3 } }, // Subtitle merge
            ];
            XLSX.utils.book_append_sheet(wb, ws1, '📊 Ringkasan');

            // === SHEET 2: Detail Laporan ===
            const reportsHeader = [
                ['DETAIL LAPORAN - IRRS'],
                ['Total: ' + reports.length + ' laporan | Export: ' + exportDate],
                [],
            ];
            
            const reportsTableData = reports.map((r, idx) => ({
                'No': idx + 1,
                'ID Laporan': r.id.slice(0, 8).toUpperCase(),
                'Judul Laporan': r.title,
                'Status': STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG]?.label || r.status,
                'Severity': r.severity?.toUpperCase() || '-',
                'Stasiun': r.stations?.code || '-',
                'Nama Stasiun': r.stations?.name || '-',
                'Divisi Tujuan': r.target_division || '-',
                'Pelapor': r.users?.full_name || '-',
                'Lokasi': r.location || '-',
                'Tanggal Dibuat': new Date(r.created_at).toLocaleDateString('id-ID'),
                'Waktu': new Date(r.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            }));

            const ws2Header = XLSX.utils.aoa_to_sheet(reportsHeader);
            XLSX.utils.sheet_add_json(ws2Header, reportsTableData, { origin: 'A4' });
            ws2Header['!cols'] = [
                { wch: 5 },  // No
                { wch: 12 }, // ID
                { wch: 40 }, // Judul
                { wch: 18 }, // Status
                { wch: 10 }, // Severity
                { wch: 8 },  // Stasiun
                { wch: 25 }, // Nama Stasiun
                { wch: 12 }, // Divisi
                { wch: 20 }, // Pelapor
                { wch: 20 }, // Lokasi
                { wch: 14 }, // Tanggal
                { wch: 8 },  // Waktu
            ];
            XLSX.utils.book_append_sheet(wb, ws2Header, '📋 Detail Laporan');

            // === SHEET 3: Performa Stasiun ===
            const stationHeader = [
                ['PERFORMA PER STASIUN'],
                ['Analisis efisiensi penyelesaian laporan'],
                [],
            ];

            const stationTableData = (analytics?.stationData || []).map((s, idx) => {
                const efficiency = Math.round((s.resolved / Math.max(s.total, 1)) * 100);
                return {
                    'No': idx + 1,
                    'Kode Stasiun': s.station,
                    'Total Laporan': s.total,
                    'Selesai': s.resolved,
                    'Pending': s.total - s.resolved,
                    'Efisiensi (%)': `${efficiency}%`,
                    'Rating': efficiency >= 90 ? '⭐⭐⭐⭐⭐' : efficiency >= 75 ? '⭐⭐⭐⭐' : efficiency >= 60 ? '⭐⭐⭐' : efficiency >= 40 ? '⭐⭐' : '⭐',
                };
            });

            const ws3Header = XLSX.utils.aoa_to_sheet(stationHeader);
            XLSX.utils.sheet_add_json(ws3Header, stationTableData, { origin: 'A4' });
            ws3Header['!cols'] = [
                { wch: 5 },  // No
                { wch: 15 }, // Kode
                { wch: 14 }, // Total
                { wch: 12 }, // Selesai
                { wch: 12 }, // Pending
                { wch: 14 }, // Efisiensi
                { wch: 15 }, // Rating
            ];
            XLSX.utils.book_append_sheet(wb, ws3Header, '📍 Performa Stasiun');

            // === SHEET 4: Status Distribution ===
            const statusData = [
                ['DISTRIBUSI STATUS LAPORAN'],
                [`Per tanggal ${exportDate}`],
                [],
                ['Status', 'Jumlah', 'Persentase', 'Indikator'],
                ['Menunggu ACC (OPEN)', reports.filter(r => r.status === 'OPEN').length, `${Math.round((reports.filter(r => r.status === 'OPEN').length / Math.max(reports.length, 1)) * 100)}%`, '🔵'],
                ['Di-ACC (ACKNOWLEDGED)', reports.filter(r => r.status === 'ACKNOWLEDGED').length, `${Math.round((reports.filter(r => r.status === 'ACKNOWLEDGED').length / Math.max(reports.length, 1)) * 100)}%`, '🟡'],
                ['Dikerjakan (ON_PROGRESS)', reports.filter(r => r.status === 'ON_PROGRESS').length, `${Math.round((reports.filter(r => r.status === 'ON_PROGRESS').length / Math.max(reports.length, 1)) * 100)}%`, '🟠'],
                ['Validasi (WAITING_VALIDATION)', reports.filter(r => r.status === 'WAITING_VALIDATION').length, `${Math.round((reports.filter(r => r.status === 'WAITING_VALIDATION').length / Math.max(reports.length, 1)) * 100)}%`, '🟣'],
                ['Selesai (CLOSED)', reports.filter(r => r.status === 'CLOSED').length, `${Math.round((reports.filter(r => r.status === 'CLOSED').length / Math.max(reports.length, 1)) * 100)}%`, '🟢'],
                ['Dikembalikan (RETURNED)', reports.filter(r => r.status === 'RETURNED').length, `${Math.round((reports.filter(r => r.status === 'RETURNED').length / Math.max(reports.length, 1)) * 100)}%`, '🔴'],
            ];

            const ws4 = XLSX.utils.aoa_to_sheet(statusData);
            ws4['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
            XLSX.utils.book_append_sheet(wb, ws4, '📈 Distribusi Status');

            // Generate filename with timestamp
            const filename = `IRRS-Analytics-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.xlsx`;
            
            XLSX.writeFile(wb, filename);
        } finally {
            setExporting(null);
        }
    };

    const exportToPDF = async () => {
        setExporting('pdf');
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();

            doc.setFillColor(16, 185, 129);
            doc.rect(0, 0, pageWidth, 40, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('LAPORAN ANALITIK IRRS', pageWidth / 2, 18, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Periode: ${dateRange.toUpperCase()} | Export: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, 30, { align: 'center' });

            doc.setTextColor(0, 0, 0);
            let yPos = 55;

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('RINGKASAN EKSEKUTIF', 14, yPos);
            yPos += 10;

            const summaryItems = [
                { label: 'Total Laporan', value: analytics?.summary.totalReports || 0 },
                { label: 'Selesai', value: analytics?.summary.resolvedReports || 0 },
                { label: 'Resolusi', value: `${analytics?.summary.avgResolutionRate || 0}%` },
                { label: 'High Sev.', value: analytics?.summary.highSeverity || 0 },
            ];

            const cardWidth = (pageWidth - 28 - 15) / 4;
            summaryItems.forEach((item, idx) => {
                const x = 14 + (idx * (cardWidth + 5));
                doc.setFillColor(248, 250, 252);
                doc.roundedRect(x, yPos, cardWidth, 25, 3, 3, 'F');

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text(item.label, x + 5, yPos + 8);

                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text(String(item.value), x + 5, yPos + 20);
            });

            yPos += 35;

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('DETAIL LAPORAN TERBARU', 14, yPos);
            yPos += 5;

            autoTable(doc, {
                startY: yPos,
                head: [['ID', 'Judul', 'Status', 'Severity', 'Stasiun', 'Tanggal']],
                body: reports.slice(0, 15).map(r => [
                    r.id.slice(0, 8),
                    r.title.substring(0, 30) + (r.title.length > 30 ? '...' : ''),
                    STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG]?.label || r.status,
                    r.severity,
                    r.stations?.code || '-',
                    new Date(r.created_at).toLocaleDateString('id-ID')
                ]),
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129], fontSize: 8, fontStyle: 'bold' },
                bodyStyles: { fontSize: 7 },
                margin: { left: 14, right: 14 },
            });

            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Gapura Angkasa - IRRS Analytics | Halaman ${i} dari ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
            }

            doc.save(`Analytics-IRRS-${new Date().toISOString().split('T')[0]}.pdf`);
        } finally {
            setExporting(null);
        }
    };

    // Derived Logic
    const pendingValidation = reports.filter(r => r.status === 'WAITING_VALIDATION');
    const todayCases = reports.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString());

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            // Check if it's a pie chart (no label) or bar/line chart (has label)
            const isPieChart = !label && payload[0]?.payload?.name || payload[0]?.payload?.division;
            
            if (isPieChart) {
                // Pie chart tooltip - single value with color
                const data = payload[0];
                const displayName = data.name || data.payload?.name || data.payload?.division || data.payload?.category || 'Unknown';
                const displayValue = data.value;
                const color = data.fill || data.color || '#10b981';
                
                return (
                    <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-2xl min-w-[140px]">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                            <p className="text-sm font-bold text-gray-900">{displayName}</p>
                        </div>
                        <p className="text-2xl font-bold" style={{ color }}>{displayValue}</p>
                        <p className="text-xs text-gray-500">laporan</p>
                    </div>
                );
            } else {
                // Bar/Line chart tooltip - multiple values
                return (
                    <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-2xl min-w-[160px]">
                        <p className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">{label}</p>
                        <div className="space-y-2">
                            {payload.map((entry: any, idx: number) => (
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
        }
        return null;
    };

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const avgResolutionTime = '2.4 jam';
    const slaCompliance = 94;

    // Loading state
    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <div
                    className="w-12 h-12 rounded-full border-4 animate-spin"
                    style={{ borderColor: 'var(--surface-4)', borderTopColor: 'var(--brand-primary)' }}
                />
                <p className="text-sm text-[var(--text-muted)] mt-4 uppercase tracking-widest font-bold">Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 stagger-children">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 animate-fade-in-up">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
                        Dashboard OSC
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Pusat Komando & Analytics Divisi Operational Services Center
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Date Range Filter */}
                    <div className="flex bg-[var(--surface-2)] rounded-xl p-1 border border-[var(--surface-4)]">
                        {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all",
                                    dateRange === range
                                        ? "bg-[var(--brand-primary)] text-white shadow-sm"
                                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                            >
                                {range === 'week' ? '7D' : range === 'month' ? '30D' : range === 'quarter' ? '90D' : '1Y'}
                            </button>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => router.push('/dashboard/employee/new')}
                            className="btn-primary"
                        >
                            <Plus size={16} />
                            Buat Laporan
                        </button>
                        <button
                            onClick={() => fetchData(true)}
                            disabled={refreshing}
                            className={cn(
                                "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                                "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]",
                                refreshing && "opacity-50"
                            )}
                        >
                            <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
                            {refreshing ? 'Memuat...' : 'Refresh'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Validation Alert (Critical Action) */}
            {pendingValidation.length > 0 && (
                <div
                    className="card-solid flex items-center gap-4 animate-fade-in-up"
                    style={{
                        background: 'oklch(0.60 0.15 250 / 0.08)',
                        border: '1px solid oklch(0.60 0.15 250 / 0.2)',
                        padding: 'var(--space-lg)'
                    }}
                >
                    <div
                        className="p-3 rounded-xl"
                        style={{ background: 'oklch(0.60 0.15 250 / 0.15)' }}
                    >
                        <ShieldCheckCode size={24} style={{ color: 'oklch(0.50 0.15 250)' }} />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold" style={{ color: 'oklch(0.40 0.15 250)' }}>
                            {pendingValidation.length} Laporan Menunggu Validasi
                        </p>
                        <p className="text-sm" style={{ color: 'oklch(0.55 0.12 250)' }}>
                            Persetujuan diperlukan untuk menutup laporan
                        </p>
                    </div>
                    <Link
                        href="/dashboard/admin/reports?status=WAITING_VALIDATION"
                        className="btn-primary"
                        style={{
                            background: 'oklch(0.55 0.15 250)',
                            boxShadow: '0 4px 16px oklch(0.55 0.15 250 / 0.3)'
                        }}
                    >
                        Review
                        <ArrowRight size={16} />
                    </Link>
                </div>
            )}

            {/* Summary Stats - Enhanced */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <StatCard title="Total Laporan" value={analytics?.summary.totalReports || 0} icon={FileText} color="blue" />
                <StatCard title="Diselesaikan" value={analytics?.summary.resolvedReports || 0} icon={CheckCircle2} color="green" trend="+12%" />
                <StatCard title="Menunggu" value={analytics?.summary.pendingReports || 0} icon={Clock} color="amber" />
                <StatCard title="High Severity" value={analytics?.summary.highSeverity || 0} icon={AlertTriangle} color="red" />
                <StatCard title="Resolusi" value={`${analytics?.summary.avgResolutionRate || 0}%`} icon={Zap} color="purple" />
                <StatCard title="SLA Compliance" value={`${slaCompliance}%`} icon={Shield} color="emerald" />
            </div>

            {/* Export Actions */}
            <div className="flex gap-3 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                <button
                    onClick={exportToExcel}
                    disabled={exporting !== null}
                    className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                        "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100",
                        exporting === 'excel' && "opacity-50"
                    )}
                >
                    {exporting === 'excel' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                    Export Excel
                </button>
                <button
                    onClick={exportToPDF}
                    disabled={exporting !== null}
                    className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                        "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
                        exporting === 'pdf' && "opacity-50"
                    )}
                >
                    {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                    Export PDF
                </button>
            </div>

            {/* Main Charts - Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <div className="card-solid lg:col-span-2 p-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
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
                            <AreaChart data={analytics?.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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

                {/* Severity Distribution */}
                <div className="card-solid p-6 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-lg text-[var(--text-primary)]">Tingkat Severity</h3>
                            <p className="text-xs text-[var(--text-muted)]">Distribusi prioritas</p>
                        </div>
                        <AlertCircle size={20} className="text-[var(--text-muted)]" />
                    </div>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPie>
                                <Pie
                                    data={severityData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={3}
                                    dataKey="value"
                                    cornerRadius={4}
                                >
                                    {severityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </RechartsPie>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {severityData.map((s) => (
                            <div key={s.name} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.fill }} />
                                <span className="text-xs text-[var(--text-secondary)]">{s.name} ({s.value}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Charts Row 2 - Weekly + Resolution Time + Division */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Weekly Activity */}
                <div className="card-solid p-6 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-lg text-[var(--text-primary)]">Aktivitas Mingguan</h3>
                            <p className="text-xs text-[var(--text-muted)]">Laporan per hari</p>
                        </div>
                        <CalendarDays size={20} className="text-[var(--text-muted)]" />
                    </div>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--surface-4)" />
                                <XAxis dataKey="day" tick={{fill: 'var(--text-secondary)', fontSize: 10}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fill: 'var(--text-secondary)', fontSize: 10}} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="reports" name="Masuk" fill="var(--surface-4)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="resolved" name="Selesai" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Resolution Time Distribution */}
                <div className="card-solid p-6 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-lg text-[var(--text-primary)]">Waktu Resolusi</h3>
                            <p className="text-xs text-[var(--text-muted)]">Distribusi durasi penyelesaian</p>
                        </div>
                        <Timer size={20} className="text-[var(--text-muted)]" />
                    </div>
                    <div className="space-y-3">
                        {resolutionTimeData.map((item, idx) => {
                            const maxCount = Math.max(...resolutionTimeData.map(i => i.count));
                            const percentage = Math.round((item.count / maxCount) * 100);
                            return (
                                <div key={item.range}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-[var(--text-secondary)]">{item.range}</span>
                                        <span className="font-bold text-[var(--text-primary)]">{item.count}%</span>
                                    </div>
                                    <div className="h-2 bg-[var(--surface-3)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${percentage}%`, background: COLORS[idx % COLORS.length] }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-[var(--surface-4)] flex items-center justify-between">
                        <span className="text-xs text-[var(--text-muted)]">Rata-rata resolusi:</span>
                        <span className="text-sm font-bold text-[var(--brand-primary)]">{avgResolutionTime}</span>
                    </div>
                </div>

                {/* Division Distribution */}
                <div className="card-solid p-6 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-lg text-[var(--text-primary)]">Distribusi Divisi</h3>
                            <p className="text-xs text-[var(--text-muted)]">Laporan per divisi</p>
                        </div>
                        <Users size={20} className="text-[var(--text-muted)]" />
                    </div>
                    <div className="h-[200px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPie>
                                <Pie
                                    data={analytics?.divisionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="count"
                                    cornerRadius={4}
                                >
                                    {analytics?.divisionData?.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </RechartsPie>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xl font-bold text-[var(--text-primary)]">
                                {analytics?.divisionData?.reduce((sum, d) => sum + d.count, 0) || 0}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Total</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                        {analytics?.divisionData?.map((d, i) => (
                            <div key={d.division} className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                <span className="text-[10px] text-[var(--text-secondary)] truncate">{d.division}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Charts Row 3 - Station + Category */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Station Performance */}
                <div className="card-solid p-6 animate-fade-in-up" style={{ animationDelay: '700ms' }}>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-lg text-[var(--text-primary)]">Performa Stasiun</h3>
                            <p className="text-xs text-[var(--text-muted)]">Total vs Selesai per stasiun</p>
                        </div>
                        <Building2 size={20} className="text-[var(--text-muted)]" />
                    </div>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics?.stationData?.slice(0, 6)} layout="vertical" margin={{ left: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--surface-4)" />
                                <XAxis type="number" tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="station" tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} width={40} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="total" name="Total" fill="var(--surface-4)" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="resolved" name="Selesai" fill="var(--brand-primary)" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="card-solid p-6 animate-fade-in-up" style={{ animationDelay: '800ms' }}>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-lg text-[var(--text-primary)]">Kategori Insiden</h3>
                            <p className="text-xs text-[var(--text-muted)]">Top 5 jenis masalah</p>
                        </div>
                        <Target size={20} className="text-[var(--text-muted)]" />
                    </div>
                    <div className="space-y-4">
                        {analytics?.categoryData?.slice(0, 5).map((cat, idx) => {
                            const total = analytics?.categoryData?.reduce((sum, c) => sum + c.count, 0) || 1;
                            const percentage = Math.round((cat.count / total) * 100);
                            return (
                                <div key={cat.category}>
                                    <div className="flex justify-between text-sm mb-1.5">
                                        <span className="font-medium text-[var(--text-primary)]">{cat.category}</span>
                                        <span className="text-[var(--text-muted)]">{cat.count} ({percentage}%)</span>
                                    </div>
                                    <div className="h-2.5 bg-[var(--surface-3)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000"
                                            style={{ width: `${percentage}%`, background: COLORS[idx % COLORS.length] }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Charts Row 4 - SLA + Top Reporters + Status Flow */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* SLA Compliance Gauge */}
                <div className="card-solid p-6 animate-fade-in-up" style={{ animationDelay: '850ms' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-lg text-[var(--text-primary)]">SLA Compliance</h3>
                            <p className="text-xs text-[var(--text-muted)]">Target: 95%</p>
                        </div>
                        <Gauge size={20} className="text-[var(--text-muted)]" />
                    </div>
                    <div className="flex flex-col items-center justify-center py-6">
                        <div className="relative w-40 h-40">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--surface-4)" strokeWidth="12" />
                                <circle 
                                    cx="60" cy="60" r="50" fill="none" 
                                    stroke={slaCompliance >= 95 ? '#10b981' : slaCompliance >= 80 ? '#f59e0b' : '#ef4444'}
                                    strokeWidth="12" 
                                    strokeLinecap="round"
                                    strokeDasharray={`${(slaCompliance / 100) * 314} 314`}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold" style={{ color: slaCompliance >= 95 ? '#10b981' : slaCompliance >= 80 ? '#f59e0b' : '#ef4444' }}>
                                    {slaCompliance}%
                                </span>
                                <span className="text-xs text-[var(--text-muted)]">Tercapai</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between text-xs mt-2">
                        <span className="text-[var(--text-muted)]">Breach: {analytics?.summary?.slaBreachCount || 3}</span>
                        <span className={slaCompliance >= 95 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                            {slaCompliance >= 95 ? '✓ On Target' : '⚠ Below Target'}
                        </span>
                    </div>
                </div>

                {/* Top Reporters */}
                <div className="card-solid p-6 animate-fade-in-up" style={{ animationDelay: '900ms' }}>
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
                <div className="card-solid p-6 animate-fade-in-up" style={{ animationDelay: '950ms' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-lg text-[var(--text-primary)]">Alur Status</h3>
                            <p className="text-xs text-[var(--text-muted)]">Distribusi status laporan</p>
                        </div>
                        <Activity size={20} className="text-[var(--text-muted)]" />
                    </div>
                    <div className="space-y-3">
                        {[
                            { status: 'OPEN', label: 'Menunggu', count: reports.filter(r => r.status === 'OPEN').length },
                            { status: 'ACKNOWLEDGED', label: 'Di-ACC', count: reports.filter(r => r.status === 'ACKNOWLEDGED').length },
                            { status: 'ON_PROGRESS', label: 'Dikerjakan', count: reports.filter(r => r.status === 'ON_PROGRESS').length },
                            { status: 'WAITING_VALIDATION', label: 'Validasi', count: reports.filter(r => r.status === 'WAITING_VALIDATION').length },
                            { status: 'CLOSED', label: 'Selesai', count: reports.filter(r => r.status === 'CLOSED').length },
                        ].map((item) => {
                            const cfg = STATUS_CONFIG[item.status as ReportStatus];
                            const maxCount = Math.max(reports.length, 1);
                            const percentage = Math.round((item.count / maxCount) * 100);
                            return (
                                <div key={item.status}>
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

            {/* Monthly Comparison */}
            <div className="card-solid p-6 animate-fade-in-up" style={{ animationDelay: '1000ms' }}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-bold text-lg text-[var(--text-primary)]">Perbandingan Bulanan</h3>
                        <p className="text-xs text-[var(--text-muted)]">Masuk vs Selesai per bulan</p>
                    </div>
                    <TrendingUp size={20} className="text-[var(--text-muted)]" />
                </div>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={[
                            { month: 'Jul', masuk: 45, selesai: 38, rate: 84 },
                            { month: 'Agu', masuk: 52, selesai: 45, rate: 87 },
                            { month: 'Sep', masuk: 48, selesai: 44, rate: 92 },
                            { month: 'Okt', masuk: 61, selesai: 55, rate: 90 },
                            { month: 'Nov', masuk: 55, selesai: 52, rate: 95 },
                            { month: 'Des', masuk: 68, selesai: 62, rate: 91 },
                        ]} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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

            {/* Recent Reports Table */}
            <div className="card-solid p-0 overflow-hidden animate-fade-in-up" style={{ animationDelay: '900ms' }}>
                <div className="p-6 border-b border-[var(--surface-4)] bg-[var(--surface-2)]/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-lg text-[var(--text-primary)]">Laporan Terbaru</h3>
                            <p className="text-xs text-[var(--text-muted)]">10 laporan terakhir</p>
                        </div>
                        <Link href="/dashboard/admin/reports" className="btn-secondary" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                            Lihat Semua
                            <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--surface-4)]">
                                <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">ID</th>
                                <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">Judul</th>
                                <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">Status</th>
                                <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">Severity</th>
                                <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">Stasiun</th>
                                <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">Tanggal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.slice(0, 10).map((r) => (
                                <tr key={r.id} className="border-b border-[var(--surface-4)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/admin/reports/${r.id}`)}>
                                    <td className="p-4 font-mono text-sm">{r.id.slice(0, 8)}</td>
                                    <td className="p-4 text-sm font-medium text-[var(--text-primary)] max-w-[300px] truncate">{r.title}</td>
                                    <td className="p-4">
                                        <span
                                            className="px-2 py-1 rounded-full text-[10px] font-bold uppercase"
                                            style={{
                                                color: STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG]?.color,
                                                backgroundColor: STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG]?.bgColor
                                            }}
                                        >
                                            {STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG]?.label || r.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={cn(
                                            "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                            r.severity === 'high' || r.severity === 'urgent' ? "bg-red-100 text-red-700" :
                                            r.severity === 'medium' ? "bg-amber-100 text-amber-700" :
                                            "bg-green-100 text-green-700"
                                        )}>
                                            {r.severity}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-[var(--text-secondary)]">{r.stations?.code || '-'}</td>
                                    <td className="p-4 text-sm text-[var(--text-muted)]">{new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Icon helper
const ShieldCheckCode = ({ size, style }: { size: number, style: any }) => (
    <Shield size={size} style={style} />
);

// Stat Card Component
function StatCard({
    title,
    value,
    icon: Icon,
    color,
    trend
}: {
    title: string;
    value: string | number;
    icon: any;
    color: 'blue' | 'green' | 'purple' | 'red' | 'amber' | 'emerald';
    trend?: string;
}) {
    const colorMap = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
        green: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
        red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    };
    const c = colorMap[color];

    return (
        <div className={cn("card-solid p-4 border", c.border)}>
            <div className="flex items-center justify-between mb-2">
                <div className={cn("p-1.5 rounded-lg", c.bg)}>
                    <Icon size={14} className={c.text} />
                </div>
                {trend && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <ArrowUp size={10} />
                        {trend}
                    </span>
                )}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">{title}</p>
            <p className="text-xl lg:text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        </div>
    );
}
