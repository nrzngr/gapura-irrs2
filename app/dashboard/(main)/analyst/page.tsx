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
    Line, RadialBarChart, RadialBar, ComposedChart, LabelList
} from 'recharts';
// xlsx, jspdf, jspdf-autotable are loaded dynamically on export click to reduce initial bundle

import { STATUS_CONFIG, type ReportStatus } from '@/lib/constants/report-status';
import { type Report } from '@/types';
import { cn } from '@/lib/utils';
import { ReportDetailModal } from '@/components/dashboard/ReportDetailModal';
import { PresentationSlide } from '@/components/dashboard/PresentationSlide';

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

export default function AnalystDashboard() {
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
    const [dateRange, setDateRange] = useState<'all' | 'week' | 'month'>('all');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [customDashboards, setCustomDashboards] = useState<{ id: string; name: string; description: string | null; slug: string; created_at: string }[]>([]);

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
                setAnalytics(data);
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
        fetch('/api/dashboards')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.dashboards) setCustomDashboards(data.dashboards); })
            .catch(() => {});
    }, [fetchData]);

    const filteredReports = useMemo(() => {
        if (dateRange === 'all') return reports;
        const now = new Date();
        const daysMap: Record<'week' | 'month', number> = { week: 7, month: 30 };
        const daysBack = daysMap[dateRange];
        const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
        return reports.filter(r => new Date(r.created_at) >= cutoffDate);
    }, [reports, dateRange]);

    // Helper to build drilldown URL with period context
    const drilldownUrl = (type: string, value: string) =>
        `/dashboard/analyst/drilldown?type=${type}&value=${encodeURIComponent(value)}&period=${dateRange}`;

    // ===== ANALYTICS DATA =====
    const caseCategoryData = useMemo(() => {
        const irregularity = filteredReports.filter(r => r.main_category === 'Irregularity').length;
        const complaint = filteredReports.filter(r => r.main_category === 'Complaint').length;
        const compliment = filteredReports.filter(r => r.main_category === 'Compliment').length;
        return [
            { name: 'Irregularity', value: irregularity, fill: '#10b981' },
            { name: 'Complaint', value: complaint, fill: '#ec4899' },
            { name: 'Compliment', value: compliment, fill: '#06b6d4' },
        ];
    }, [filteredReports]);

    const branchReportData = useMemo(() => {
        const stations: Record<string, number> = {};
        filteredReports.forEach(r => {
            const station = r.stations?.code || 'Unknown';
            stations[station] = (stations[station] || 0) + 1;
        });
        return Object.entries(stations)
            .map(([station, count]) => ({ station, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [filteredReports]);

    const monthlyReportData = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthData: Record<string, { irregularity: number; complaint: number; compliment: number }> = {};
        months.forEach(m => { monthData[m] = { irregularity: 0, complaint: 0, compliment: 0 }; });
        filteredReports.forEach(r => {
            const date = new Date(r.created_at);
            const month = months[date.getMonth()];
            if (r.main_category === 'Irregularity') monthData[month].irregularity++;
            else if (r.main_category === 'Complaint') monthData[month].complaint++;
            else if (r.main_category === 'Compliment') monthData[month].compliment++;
        });
        return months.map(month => ({ month, ...monthData[month] })).reverse();
    }, [filteredReports]);

    const categoryByAreaData = useMemo(() => {
        const areas: Record<string, number> = {};
        filteredReports.forEach(r => {
            const area = r.area || 'General';
            areas[area] = (areas[area] || 0) + 1;
        });
        const sorted = Object.entries(areas)
            .map(([area, count]) => ({ name: area, value: count }))
            .sort((a, b) => b.value - a.value);
        const fills = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
        return sorted.slice(0, 5).map((item, i) => ({ ...item, fill: fills[i % fills.length] }));
    }, [filteredReports]);

    const categoryByBranchData = useMemo(() => {
        const branchData: Record<string, { irregularity: number; complaint: number; compliment: number }> = {};
        filteredReports.forEach(r => {
            const branch = r.stations?.code || 'Unknown';
            if (!branchData[branch]) branchData[branch] = { irregularity: 0, complaint: 0, compliment: 0 };
            if (r.main_category === 'Irregularity') branchData[branch].irregularity++;
            else if (r.main_category === 'Complaint') branchData[branch].complaint++;
            else if (r.main_category === 'Compliment') branchData[branch].compliment++;
        });
        return Object.entries(branchData)
            .map(([branch, data]) => ({ branch, ...data }))
            .sort((a, b) => (b.irregularity + b.complaint + b.compliment) - (a.irregularity + a.complaint + a.compliment))
            .slice(0, 10);
    }, [filteredReports]);

    const categoryByAirlinesData = useMemo(() => {
        const airlinesData: Record<string, { irregularity: number; complaint: number; compliment: number }> = {};
        filteredReports.forEach(r => {
            const airline = r.airline || 'Unknown';
            if (!airlinesData[airline]) airlinesData[airline] = { irregularity: 0, complaint: 0, compliment: 0 };
            if (r.main_category === 'Irregularity') airlinesData[airline].irregularity++;
            else if (r.main_category === 'Complaint') airlinesData[airline].complaint++;
            else if (r.main_category === 'Compliment') airlinesData[airline].compliment++;
        });
        return Object.entries(airlinesData)
            .map(([airline, data]) => ({ airline, ...data }))
            .sort((a, b) => (b.irregularity + b.complaint + b.compliment) - (a.irregularity + a.complaint + a.compliment))
            .slice(0, 8);
    }, [filteredReports]);

    const filteredStats = useMemo(() => {
        const total = filteredReports.length;
        const resolved = filteredReports.filter(r => r.status === 'SELESAI').length;
        const pending = filteredReports.filter(r => r.status === 'MENUNGGU_FEEDBACK').length;
        const highSeverity = filteredReports.filter(r => r.severity === 'high' || r.severity === 'urgent').length;
        const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
        return { total, resolved, pending, highSeverity, resolutionRate };
    }, [filteredReports]);

    // Export Functions
    const exportToExcel = async () => {
        setExporting('excel');
        try {
            const XLSX = await import('xlsx');
            const wb = XLSX.utils.book_new();
            const now = new Date();
            const exportDate = now.toLocaleDateString('id-ID', { dateStyle: 'full' });
            const exportTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

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
                { s: { r: 1, c: 1 }, e: { r: 1, c: 3 } },
                { s: { r: 2, c: 1 }, e: { r: 2, c: 3 } },
            ];
            XLSX.utils.book_append_sheet(wb, ws1, '📊 Ringkasan');

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
                { wch: 5 }, { wch: 12 }, { wch: 40 }, { wch: 18 }, { wch: 10 },
                { wch: 8 }, { wch: 25 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
                { wch: 14 }, { wch: 8 },
            ];
            XLSX.utils.book_append_sheet(wb, ws2Header, '📋 Detail Laporan');

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
                { wch: 5 }, { wch: 15 }, { wch: 14 }, { wch: 12 },
                { wch: 12 }, { wch: 14 }, { wch: 15 },
            ];
            XLSX.utils.book_append_sheet(wb, ws3Header, '📍 Performa Stasiun');

            const statusData = [
                ['DISTRIBUSI STATUS LAPORAN'],
                [`Per tanggal ${exportDate}`],
                [],
                ['Status', 'Jumlah', 'Persentase', 'Indikator'],
                ['Menunggu Feedback', filteredReports.filter(r => r.status === 'MENUNGGU_FEEDBACK').length, `${Math.round((filteredReports.filter(r => r.status === 'MENUNGGU_FEEDBACK').length / Math.max(filteredReports.length, 1)) * 100)}%`, '🟡'],
                ['Sudah Diverifikasi', filteredReports.filter(r => r.status === 'SUDAH_DIVERIFIKASI').length, `${Math.round((filteredReports.filter(r => r.status === 'SUDAH_DIVERIFIKASI').length / Math.max(filteredReports.length, 1)) * 100)}%`, '🔵'],
                ['Selesai', filteredReports.filter(r => r.status === 'SELESAI').length, `${Math.round((filteredReports.filter(r => r.status === 'SELESAI').length / Math.max(filteredReports.length, 1)) * 100)}%`, '🟢'],
            ];

            const ws4 = XLSX.utils.aoa_to_sheet(statusData);
            ws4['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
            XLSX.utils.book_append_sheet(wb, ws4, '📈 Distribusi Status');

            const filename = `IRRS-Analytics-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.xlsx`;
            XLSX.writeFile(wb, filename);
        } finally {
            setExporting(null);
        }
    };

    const exportToPDF = async () => {
        setExporting('pdf');
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');
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

    const pendingFeedback = filteredReports.filter(r => r.status === 'MENUNGGU_FEEDBACK');
    const todayCases = filteredReports.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString());

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const isPieChart = !label && payload[0]?.payload?.name || payload[0]?.payload?.division;

            if (isPieChart) {
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
        <div className="space-y-6 pb-24 stagger-children snap-y">
            {/* Slide 1: Header + Stats + Export */}
            <PresentationSlide className="!p-0 !min-h-0 !bg-transparent !shadow-none !border-0">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 animate-fade-in-up">
                        <div className="flex-1">
                            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
                                Dashboard Analyst
                            </h1>
                            <p className="text-[var(--text-secondary)] mt-1">
                                Pusat Komando & Analytics Divisi Operational Services Center
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex bg-[var(--surface-2)] rounded-xl p-1 border border-[var(--surface-4)]">
                                {(['all', 'month', 'week'] as const).map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => setDateRange(range)}
                                        className={cn(
                                            "px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap",
                                            dateRange === range
                                                ? "bg-[var(--brand-primary)] text-white shadow-sm"
                                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                        )}
                                    >
                                        {range === 'all' ? 'Semua Waktu' : range === 'month' ? '30 Hari Terakhir' : '7 Hari Terakhir'}
                                    </button>
                                ))}
                            </div>

                            <button onClick={() => router.push('/dashboard/employee/new')} className="btn-primary">
                                <Plus size={16} /> Buat Laporan
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

                    {/* Pending Feedback Alert */}
                    {pendingFeedback.length > 0 && (
                        <div
                            className="card-solid flex items-center gap-4 animate-fade-in-up cursor-pointer"
                            style={{
                                background: 'oklch(0.60 0.15 250 / 0.08)',
                                border: '1px solid oklch(0.60 0.15 250 / 0.2)',
                                padding: 'var(--space-lg)'
                            }}
                            onClick={() => router.push(drilldownUrl('status', 'MENUNGGU_FEEDBACK'))}
                        >
                            <div className="p-3 rounded-xl" style={{ background: 'oklch(0.60 0.15 250 / 0.15)' }}>
                                <ShieldCheckCode size={24} style={{ color: 'oklch(0.50 0.15 250)' }} />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold" style={{ color: 'oklch(0.40 0.15 250)' }}>
                                    {pendingFeedback.length} Laporan Menunggu Feedback
                                </p>
                                <p className="text-sm" style={{ color: 'oklch(0.55 0.12 250)' }}>
                                    Perlu verifikasi dari analyst
                                </p>
                            </div>
                            <div
                                className="btn-primary"
                                style={{
                                    background: 'oklch(0.55 0.15 250)',
                                    boxShadow: '0 4px 16px oklch(0.55 0.15 250 / 0.3)'
                                }}
                            >
                                Review
                                <ArrowRight size={16} />
                            </div>
                        </div>
                    )}

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <StatCard title="Total Laporan" value={filteredStats.total} icon={FileText} color="blue" onClick={() => router.push(drilldownUrl('severity', 'all'))} />
                        <StatCard title="Diselesaikan" value={filteredStats.resolved} icon={CheckCircle2} color="green" onClick={() => router.push(drilldownUrl('status', 'SELESAI'))} />
                        <StatCard title="Menunggu" value={filteredStats.pending} icon={Clock} color="amber" onClick={() => router.push(drilldownUrl('status', 'MENUNGGU_FEEDBACK'))} />
                        <StatCard title="High Severity" value={filteredStats.highSeverity} icon={AlertTriangle} color="red" onClick={() => router.push(drilldownUrl('severity', 'high'))} />
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
                            Download Excel
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
                            Download PDF
                        </button>
                    </div>
                </div>
            </PresentationSlide>

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
                                    data={analytics?.trendData}
                                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                    onClick={(state) => {
                                        if (state?.activeLabel) {
                                            router.push(drilldownUrl('month', String(state.activeLabel)));
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
                                        data={caseCategoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={3}
                                        dataKey="value"
                                        cornerRadius={4}
                                        onClick={(data) => {
                                            if (data?.name) router.push(drilldownUrl('category', data.name));
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {caseCategoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </RechartsPie>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold text-[var(--text-primary)]">
                                    {caseCategoryData.reduce((sum, d) => sum + d.value, 0)}
                                </span>
                                <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Total</span>
                            </div>
                        </div>
                        <div className="flex justify-center gap-6 mt-2">
                            {caseCategoryData.map((s) => (
                                <div
                                    key={s.name}
                                    className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                                    onClick={() => router.push(drilldownUrl('category', s.name))}
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
                                <BarChart data={branchReportData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--surface-4)" />
                                    <XAxis dataKey="station" tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fill: 'var(--text-secondary)', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="count"
                                        name="Laporan"
                                        fill="#10b981"
                                        radius={[4, 4, 0, 0]}
                                        onClick={(data: any) => {
                                            if (data?.station) router.push(drilldownUrl('station', data.station));
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
                                    data={monthlyReportData}
                                    layout="vertical"
                                    margin={{ left: 30, right: 10 }}
                                    onClick={(state) => {
                                        if (state?.activeLabel) router.push(drilldownUrl('month', String(state.activeLabel)));
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
                                        data={categoryByAreaData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                        cornerRadius={4}
                                        onClick={(data) => {
                                            if (data?.name) router.push(drilldownUrl('area', data.name));
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {categoryByAreaData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </RechartsPie>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-xl font-bold text-[var(--text-primary)]">
                                    {categoryByAreaData.reduce((sum, d) => sum + d.value, 0)}
                                </span>
                                <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Total</span>
                            </div>
                        </div>
                        <div className="flex justify-center gap-4 mt-2">
                            {categoryByAreaData.map((d) => (
                                <div
                                    key={d.name}
                                    className="flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity"
                                    onClick={() => router.push(drilldownUrl('area', d.name))}
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
                                    data={categoryByBranchData}
                                    layout="vertical"
                                    margin={{ left: 30, right: 10 }}
                                    onClick={(state) => {
                                        if (state?.activeLabel) router.push(drilldownUrl('station', String(state.activeLabel)));
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
                                data={categoryByAirlinesData}
                                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                                onClick={(state) => {
                                    if (state?.activeLabel) router.push(drilldownUrl('airline', String(state.activeLabel)));
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
                                        onClick={() => router.push(drilldownUrl('status', item.status))}
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
                                    if (state?.activeLabel) router.push(drilldownUrl('month', String(state.activeLabel)));
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

            {/* Slide 8: Reports Table */}
            <PresentationSlide
                title="Laporan Hari Ini"
                subtitle={`${todayCases.length} laporan hari ini`}
                icon={FileText}
            >
                <div className="card-solid p-0 overflow-hidden">
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
                                {todayCases.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                                            Tidak ada laporan hari ini
                                        </td>
                                    </tr>
                                ) : (
                                    todayCases.slice(0, 10).map((r) => (
                                        <tr key={r.id} className="border-b border-[var(--surface-4)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer" onClick={() => setSelectedReport(r)}>
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
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </PresentationSlide>

            {/* Custom Dashboards */}
            {customDashboards.length > 0 && (
                <PresentationSlide
                    title="Custom Dashboard"
                    subtitle="Dashboard kustom yang dibuat oleh Analyst"
                    icon={BarChart3}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {customDashboards.map(d => (
                            <a
                                key={d.id}
                                href={`/embed/custom/${d.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="card-solid p-4 hover:bg-[var(--surface-2)] transition-colors group"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                                        {d.name}
                                    </h4>
                                    <Eye size={14} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                                </div>
                                {d.description && (
                                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-2">{d.description}</p>
                                )}
                                <p className="text-[10px] text-[var(--text-muted)]">
                                    {new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            </a>
                        ))}
                        <Link
                            href="/dashboard/analyst/builder"
                            className="card-solid p-4 border-dashed flex flex-col items-center justify-center gap-2 hover:bg-[var(--surface-2)] transition-colors min-h-[100px]"
                        >
                            <Plus size={20} className="text-[var(--text-muted)]" />
                            <span className="text-xs font-medium text-[var(--text-muted)]">Buat Dashboard Baru</span>
                        </Link>
                    </div>
                </PresentationSlide>
            )}

            {/* Report Detail Modal */}
            <ReportDetailModal
                isOpen={!!selectedReport}
                onClose={() => setSelectedReport(null)}
                report={selectedReport}
                userRole="ANALYST"
            />
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
    trend,
    onClick,
}: {
    title: string;
    value: string | number;
    icon: any;
    color: 'blue' | 'green' | 'purple' | 'red' | 'amber' | 'emerald';
    trend?: string;
    onClick?: () => void;
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
        <div
            className={cn("card-solid p-4 border transition-colors", c.border, onClick && "cursor-pointer hover:bg-[var(--surface-2)]")}
            onClick={onClick}
        >
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
