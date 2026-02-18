'use client';


// Triggering HMR
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import dynamic from 'next/dynamic';
import {
    Clock, CheckCircle2,
    FileText, RefreshCw, Loader2, Plus,
    FileSpreadsheet, ArrowRight, Shield,
    AlertTriangle, ArrowUp, LayoutDashboard
} from 'lucide-react';

const AnalystCharts = dynamic(() => import('@/components/dashboard/analyst/AnalystCharts'), {
    ssr: false,
    loading: () => (
        <div className="min-h-[40vh] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 animate-spin" style={{ borderColor: 'var(--surface-4)', borderTopColor: 'var(--brand-primary)' }} />
        </div>
    ),
});

import { STATUS_CONFIG, type ReportStatus } from '@/lib/constants/report-status';
import { type Report } from '@/types';
import { cn } from '@/lib/utils';
import { ReportDetailModal } from '@/components/dashboard/ReportDetailModal';
import { PresentationSlide } from '@/components/dashboard/PresentationSlide';
import { exportToExcel as doExportExcel, exportToPDF as doExportPDF } from '@/lib/analyst-export';
import { CustomerFeedbackFilterModal } from '@/components/dashboard/analyst/CustomerFeedbackFilterModal';
import { TriageModal } from '@/components/dashboard/analyst/TriageModal';

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
    
    // Triage State
    const [triageReport, setTriageReport] = useState<Report | null>(null);
    const [isTriageOpen, setIsTriageOpen] = useState(false);

    const [cfLoading, setCfLoading] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filterLoading, setFilterLoading] = useState(false);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            if (isRefresh) {
                // Invalidate server-side cache
                await fetch('/api/reports/refresh', { method: 'POST' });
            }

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

    // Customer Feedback Dashboard shortcut handler
    const handleCustomerFeedbackShortcut = useCallback(async () => {
        setCfLoading(true);
        try {
            // Check localStorage for cached slug
            const cachedSlug = localStorage.getItem('cf_dashboard_slug');
            
            if (cachedSlug) {
                // Verify the dashboard still exists
                const checkRes = await fetch(`/api/dashboards?slug=${cachedSlug}`);
                
                if (checkRes.ok) {
                    const checkData = await checkRes.json();
                    if (checkData.dashboards?.length > 0) {
                        // Dashboard exists, navigate to it
                        router.push(`/embed/custom/${cachedSlug}`);
                        return;
                    }
                }
                
                // Dashboard not found, clear the cache

                localStorage.removeItem('cf_dashboard_slug');
            }

            // Generate new dashboard without date range
            const res = await fetch('/api/dashboards/customer-feedback-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}), // No dateFrom/dateTo
            });

            if (!res.ok) {
                throw new Error('Failed to generate dashboard');
            }

            const data = await res.json();
            if (data.dashboard?.slug) {
                // Cache the slug
                localStorage.setItem('cf_dashboard_slug', data.dashboard.slug);
                router.push(`/embed/custom/${data.dashboard.slug}`);
            } else {
                throw new Error('No slug returned');
            }
        } catch (err) {
            console.error('Customer Feedback shortcut error:', err);
            alert('Gagal membuka Customer Feedback Dashboard. Silakan coba lagi.');
        } finally {
            setCfLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchData();

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
        const irregularity = filteredReports.filter(r => r.category === 'Irregularity').length;
        const complaint = filteredReports.filter(r => r.category === 'Complaint').length;
        const compliment = filteredReports.filter(r => r.category === 'Compliment').length;
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
        const dataMap = new Map<string, { irregularity: number; complaint: number; compliment: number; date: Date }>();

        // If no reports, return empty or default? 
        // Better to allow empty stats or handle gracefully.
        
        filteredReports.forEach(r => {
            const d = new Date(r.created_at);
            if (isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
            
            if (!dataMap.has(key)) {
                dataMap.set(key, { irregularity: 0, complaint: 0, compliment: 0, date: d });
            }
            const entry = dataMap.get(key)!;
            
            if (r.category === 'Irregularity') entry.irregularity++;
            else if (r.category === 'Complaint') entry.complaint++;
            else if (r.category === 'Compliment') entry.compliment++;
        });

        // Convert to array and sort Descending (Newest first) as per screenshot
        return Array.from(dataMap.entries())
            .sort((a, b) => b[0].localeCompare(a[0])) 
            .map(([_, val]) => ({
                month: `${val.date.getFullYear()} ${val.date.toLocaleString('en-US', { month: 'short' })}`, // "2025 Jan"
                irregularity: val.irregularity,
                complaint: val.complaint,
                compliment: val.compliment
            }))
            .slice(0, 14); // Limit to last 14 months to prevent cramping
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
            if (r.category === 'Irregularity') branchData[branch].irregularity++;
            else if (r.category === 'Complaint') branchData[branch].complaint++;
            else if (r.category === 'Compliment') branchData[branch].compliment++;
        });
        return Object.entries(branchData)
            .map(([branch, data]) => ({ branch, ...data }))
            .sort((a, b) => (b.irregularity + b.complaint + b.compliment) - (a.irregularity + a.complaint + a.compliment))
            .slice(0, 10);
    }, [filteredReports]);

    const areaSubCategoryData = useMemo(() => {
        const dataMap: Record<string, Record<string, number>> = {};
        const subCategories = new Set<string>();

        filteredReports.forEach(r => {
            const area = r.area || 'General';
            const subCat = r.category || 'Uncategorized';
            
            if (!dataMap[area]) dataMap[area] = {};
            dataMap[area][subCat] = (dataMap[area][subCat] || 0) + 1;
            subCategories.add(subCat);
        });

        return Object.entries(dataMap).map(([area, counts]) => ({
            area,
            ...counts
        }));
    }, [filteredReports]);

    const categoryByAirlinesData = useMemo(() => {
        const airlinesData: Record<string, { irregularity: number; complaint: number; compliment: number }> = {};
        filteredReports.forEach(r => {
            const airline = r.airlines || 'Unknown';
            if (!airlinesData[airline]) airlinesData[airline] = { irregularity: 0, complaint: 0, compliment: 0 };
            if (r.category === 'Irregularity') airlinesData[airline].irregularity++;
            else if (r.category === 'Complaint') airlinesData[airline].complaint++;
            else if (r.category === 'Compliment') airlinesData[airline].compliment++;
        });
        return Object.entries(airlinesData)
            .map(([airline, data]) => ({ airline, ...data }))
            .sort((a, b) => (b.irregularity + b.complaint + b.compliment) - (a.irregularity + a.complaint + a.compliment))
            .slice(0, 8);
    }, [filteredReports]);

    // Complexity: Time O(n) | Space O(k) where k = unique reporters
    const topReportersData = useMemo(() => {
        const reporterMap: Record<string, { name: string; station: string; count: number }> = {};
        filteredReports.forEach(r => {
            const name = r.users?.full_name || r.reporter_name || 'Unknown';
            const station = r.stations?.code || r.branch || '-';
            const key = name;
            if (!reporterMap[key]) reporterMap[key] = { name, station, count: 0 };
            reporterMap[key].count++;
        });
        return Object.values(reporterMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [filteredReports]);

    // Complexity: Time O(n) | Space O(12) — fixed 12 months
    const monthlyComparisonData = useMemo(() => {
        const dataMap = new Map<string, { masuk: number; selesai: number; date: Date }>();
        
        filteredReports.forEach(r => {
            // Created Date -> Masuk
            const dCreated = new Date(r.created_at);
            if (!isNaN(dCreated.getTime())) {
                const keyCreated = `${dCreated.getFullYear()}-${String(dCreated.getMonth() + 1).padStart(2, '0')}`;
                if (!dataMap.has(keyCreated)) dataMap.set(keyCreated, { masuk: 0, selesai: 0, date: dCreated });
                dataMap.get(keyCreated)!.masuk++;
            }

            // Resolved Date -> Selesai
            if (r.resolved_at) {
                const dResolved = new Date(r.resolved_at);
                if (!isNaN(dResolved.getTime())) {
                    const keyResolved = `${dResolved.getFullYear()}-${String(dResolved.getMonth() + 1).padStart(2, '0')}`;
                    if (!dataMap.has(keyResolved)) dataMap.set(keyResolved, { masuk: 0, selesai: 0, date: dResolved });
                    dataMap.get(keyResolved)!.selesai++;
                }
            }
        });

        // Convert to array and sort Ascending (Left=Oldest, Right=Newest)
        // Usually comparisons are chronological. 
        // If users want consistent "Newest on Left", I should change this to 'b.localeCompare(a)'.
        // Given the other chart is Newest on Left, and user might compare them... 
        // I will stick to Ascending for Comparison as it involves a Trend Line. Trend lines go Left->Right.
        // It is very un-intuitive to have a Trend Line go Right->Left (Past->Future).
        return Array.from(dataMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0])) 
            .map(([_, val]) => {
                const rate = val.masuk > 0 ? Math.round((val.selesai / val.masuk) * 100) : 0;
                return {
                    month: `${val.date.getFullYear()} ${val.date.toLocaleString('en-US', { month: 'short' })}`, // "2025 Jan"
                    masuk: val.masuk,
                    selesai: val.selesai,
                    rate
                };
            })
            .slice(-14); // Limit to last 14 months to prevent cramping
    }, [filteredReports]);

    // Complexity: Time O(n) | Space O(4) — fixed severity levels
    const severityDistributionData = useMemo(() => {
        const severityMap: Record<string, number> = {};
        filteredReports.forEach(r => {
            const sev = r.severity || 'low';
            severityMap[sev] = (severityMap[sev] || 0) + 1;
        });
        const colorMap: Record<string, string> = {
            low: '#10b981', medium: '#f59e0b', high: '#ef4444', urgent: '#dc2626',
        };
        return Object.entries(severityMap)
            .map(([name, value]) => ({ name, value, fill: colorMap[name] || '#6b7280' }))
            .sort((a, b) => b.value - a.value);
    }, [filteredReports]);

    // Complexity: Time O(n) | Space O(k) where k = unique hubs
    const hubDistributionData = useMemo(() => {
        const hubMap: Record<string, number> = {};
        filteredReports.forEach(r => {
            const hub = r.hub || 'Unknown';
            hubMap[hub] = (hubMap[hub] || 0) + 1;
        });
        return Object.entries(hubMap)
            .map(([hub, count]) => ({ hub, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [filteredReports]);

    // Complexity: Time O(n) | Space O(k) where k = unique branches
    const resolutionByBranchData = useMemo(() => {
        const branchMap: Record<string, { total: number; resolved: number }> = {};
        filteredReports.forEach(r => {
            const branch = r.stations?.code || r.branch || 'Unknown';
            if (!branchMap[branch]) branchMap[branch] = { total: 0, resolved: 0 };
            branchMap[branch].total++;
            if (r.status === 'SELESAI') branchMap[branch].resolved++;
        });
        return Object.entries(branchMap)
            .map(([branch, data]) => ({
                branch,
                total: data.total,
                resolved: data.resolved,
                rate: data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);
    }, [filteredReports]);

    // Available options for filter modal
    const availableOptions = useMemo(() => {
        const hubs = new Set<string>();
        const branches = new Set<string>();
        const airlines = new Set<string>();
        const categories = new Set<string>();

        reports.forEach(r => {
            if (r.hub) hubs.add(r.hub);
            if (r.stations?.code) branches.add(r.stations.code);
            else if (r.branch) branches.add(r.branch);
            
            if (r.airlines) airlines.add(r.airlines);
            else if (r.airline) airlines.add(r.airline);

            if (r.main_category) categories.add(r.main_category);
        });

        return {
            hubs: Array.from(hubs).sort(),
            branches: Array.from(branches).sort(),
            airlines: Array.from(airlines).sort(),
            categories: Array.from(categories).sort()
        };
    }, [reports]);

    const handleApplyFilter = async (filterData: any) => {
        setFilterLoading(true);
        try {
            const res = await fetch('/api/dashboards/customer-feedback-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filterData),
            });

            if (!res.ok) throw new Error('Failed to generate dashboard');

            const data = await res.json();
            if (data.dashboard?.slug) {
                router.push(`/embed/custom/${data.dashboard.slug}`);
            }
        } catch (err) {
            console.error('Filter apply error:', err);
            alert('Gagal menerapkan filter');
        } finally {
            setFilterLoading(false);
            setShowFilterModal(false);
        }
    };

    const filteredStats = useMemo(() => {
        const total = filteredReports.length;
        const resolved = filteredReports.filter(r => r.status === 'SELESAI').length;
        const pending = filteredReports.filter(r => r.status === 'MENUNGGU_FEEDBACK').length;
        const highSeverity = filteredReports.filter(r => r.severity === 'high' || r.severity === 'urgent').length;
        const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
        return { total, resolved, pending, highSeverity, resolutionRate };
    }, [filteredReports]);



    const handleTriageSubmit = async (data: { primary_tag: string; sub_category_note: string; target_division: string }) => {
        if (!triageReport) return;
        
        try {
            const res = await fetch(`/api/reports/${triageReport.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    primary_tag: data.primary_tag,
                    sub_category_note: data.sub_category_note,
                    target_division: data.target_division,
                    status: 'MENUNGGU_FEEDBACK', // Ensure status reflects currently being processed
                    // Add updated_at implicitly handled by service or API
                }),
            });

            if (!res.ok) throw new Error('Failed to update report');

            // Refresh data
            await fetchData(true);
            setIsTriageOpen(false);
            setTriageReport(null);
        } catch (error) {
            console.error('Triage update failed:', error);
            alert('Gagal update laporan');
        }
    };

    const exportToExcel = async () => {
        setExporting('excel');
        try {
            await doExportExcel({ reports, filteredReports, analytics, dateRange });
        } finally {
            setExporting(null);
        }
    };

    const exportToPDF = async () => {
        setExporting('pdf');
        try {
            await doExportPDF({ reports, filteredReports, analytics, dateRange });
        } finally {
            setExporting(null);
        }
    };

    const pendingFeedback = filteredReports.filter(r => r.status === 'MENUNGGU_FEEDBACK');
    const todayCases = filteredReports.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString());



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
                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 animate-fade-in-up">
                        <div className="flex-1 space-y-1">
                            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                                Pusat Komando & Analytics
                            </h1>
                            <p className="text-[var(--text-secondary)] font-medium">
                                Divisi Operational Services Center
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                           {/* Refresh Button first for visibility or last? User said "positioning both". 
                               Let's keep controls grouped but aligned nicely.
                           */}
                           
                            <div className="flex bg-[var(--surface-2)] rounded-xl p-1 border border-[var(--surface-4)] w-full sm:w-auto overflow-x-auto">
                                {(['all', 'month', 'week'] as const).map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => setDateRange(range)}
                                        className={cn(
                                            "flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap",
                                            dateRange === range
                                                ? "bg-[var(--brand-primary)] text-white shadow-sm"
                                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                        )}
                                    >
                                        {range === 'all' ? 'Semua' : range === 'month' ? '30 Hari' : '7 Hari'}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                <button 
                                    onClick={handleCustomerFeedbackShortcut}
                                    disabled={cfLoading}
                                    className={cn(
                                        "hidden xl:inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                                        "bg-gradient-to-r from-emerald-600 to-green-500 text-white hover:shadow-lg hover:shadow-emerald-500/25",
                                        cfLoading && "opacity-70 cursor-not-allowed"
                                    )}
                                    title="Customer Feedback Dashboard"
                                >
                                    {cfLoading ? <Loader2 size={14} className="animate-spin" /> : <LayoutDashboard size={14} />}
                                    <span className="hidden 2xl:inline">Feedback</span>
                                </button>

                                <button 
                                    onClick={() => setShowFilterModal(true)}
                                    className={cn(
                                        "hidden xl:inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border",
                                        "bg-white border-[var(--surface-4)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                                    )}
                                    title="Filter Customer Feedback"
                                >
                                    <Shield size={14} />
                                    <span className="hidden 2xl:inline">Filter</span>
                                </button>

                                <button onClick={() => router.push('/dashboard/employee/new')} className="btn-primary py-2 text-xs">
                                    <Plus size={16} /> <span className="hidden sm:inline">Laporan</span>
                                </button>
                                
                                <div className="h-8 w-px bg-[var(--surface-4)] mx-1 hidden sm:block"></div>

                                <button
                                    onClick={() => fetchData(true)}
                                    disabled={refreshing}
                                    className={cn(
                                        "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all border",
                                        "bg-white border-[var(--surface-4)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
                                        refreshing && "opacity-50"
                                    )}
                                >
                                    <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
                                    {refreshing ? '...' : 'Refresh'}
                                </button>
                            </div>
                        </div>
                    </div>



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

            {/* Slide 8: Reports Table - Moved to Top */}
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
                                            <td className="p-4 font-mono text-sm">
                                                {r.id.slice(0, 8)}
                                                {/* Triage Button if Unassigned */}
                                                {!r.target_division && (r.status === 'BARU' || r.status === 'MENUNGGU_FEEDBACK') && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTriageReport(r);
                                                            setIsTriageOpen(true);
                                                        }}
                                                        className="ml-2 px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded text-[10px] font-bold uppercase hover:bg-brand-primary/20 transition-colors"
                                                    >
                                                        Triage
                                                    </button>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        {r.primary_tag === 'CGO' ? (
                                                            <span className="text-[8px] font-extrabold px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">CGO</span>
                                                        ) : (
                                                            <span className="text-[8px] font-extrabold px-1 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 uppercase">L&A</span>
                                                        )}
                                                        <span className="text-[9px] text-[var(--text-muted)] font-mono">{r.id.slice(0, 8)}</span>
                                                    </div>
                                                    <p className="text-sm font-medium text-[var(--text-primary)] max-w-[300px] truncate">
                                                        {r.report || r.title || '(Tanpa Judul)'}
                                                    </p>
                                                </div>
                                            </td>
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
                                            <td className="p-4 text-sm text-[var(--text-secondary)]">{r.stations?.code || r.branch || '-'}</td>
                                            <td className="p-4 text-sm text-[var(--text-muted)]">{new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </PresentationSlide>

            {/* Charts: lazy-loaded to keep Recharts out of the initial compile graph */}
            <AnalystCharts
                analytics={analytics}
                caseCategoryData={caseCategoryData}
                branchReportData={branchReportData}
                monthlyReportData={monthlyReportData}
                categoryByAreaData={categoryByAreaData}
                categoryByBranchData={categoryByBranchData}
                areaSubCategoryData={areaSubCategoryData}
                categoryByAirlinesData={categoryByAirlinesData}
                topReportersData={topReportersData}
                monthlyComparisonData={monthlyComparisonData}
                hubDistributionData={hubDistributionData}
                resolutionByBranchData={resolutionByBranchData}
                filteredReports={filteredReports}
                onDrilldown={(url) => router.push(url)}
                drilldownUrl={drilldownUrl}
            />





            {/* Report Detail Modal */}
            <ReportDetailModal
                isOpen={!!selectedReport}
                onClose={() => setSelectedReport(null)}
                report={selectedReport}
                userRole="ANALYST"
            />

            <CustomerFeedbackFilterModal
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                onApply={handleApplyFilter}
                loading={filterLoading}
                availableHubs={availableOptions.hubs}
                availableBranches={availableOptions.branches}
                availableAirlines={availableOptions.airlines}
                availableCategories={availableOptions.categories}
            />

            <TriageModal 
                isOpen={isTriageOpen}
                onClose={() => setIsTriageOpen(false)}
                report={triageReport}
                onSubmit={handleTriageSubmit}
            />
        </div>
    );
}

// Icon helper
const ShieldCheckCode = ({ size, style }: { size: number, style: React.CSSProperties }) => (
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
    icon: React.ElementType;
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
