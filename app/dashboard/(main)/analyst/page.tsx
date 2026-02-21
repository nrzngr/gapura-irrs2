'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { RefreshCw, Loader2 } from 'lucide-react';

// Components
import { ResponsiveHeader } from '@/components/dashboard/analyst/ResponsiveHeader';
import { ResponsiveStatsGrid } from '@/components/dashboard/analyst/ResponsiveStatsGrid';
import { ReportsTableSection } from '@/components/dashboard/analyst/ReportsTableSection';
import { ReportDetailModal } from '@/components/dashboard/ReportDetailModal';
import { PresentationSlide } from '@/components/dashboard/PresentationSlide';
import { CustomerFeedbackFilterModal } from '@/components/dashboard/analyst/CustomerFeedbackFilterModal';
import { TriageModal } from '@/components/dashboard/analyst/TriageModal';

// Utils
import { exportToExcel as doExportExcel, exportToPDF as doExportPDF } from '@/lib/analyst-export';
import type { Report } from '@/types';

// Dynamic import for charts
const AnalystCharts = dynamic(
  () => import('@/components/dashboard/analyst/AnalystCharts'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-4 animate-spin"
          style={{
            borderColor: 'var(--surface-4)',
            borderTopColor: 'var(--brand-primary)',
          }}
        />
      </div>
    ),
  }
);

// Types
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

/**
 * Refactored Analyst Dashboard Page
 * Mobile-first responsive design
 */
export default function AnalystDashboard() {
  const router = useRouter();

  // State
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

  // Filter Modal State
  const [cfLoading, setCfLoading] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [savedDashboards, setSavedDashboards] = useState<any[]>([]);

  // Fetch data
  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        if (isRefresh) {
          await fetch('/api/reports/refresh', { method: 'POST' });
        }

        const [reportsRes, analyticsRes] = await Promise.all([
          fetch('/api/admin/reports'),
          fetch('/api/admin/analytics'),
        ]);

        if (reportsRes.ok) {
          const data = await reportsRes.json();
          setReports(Array.isArray(data) ? data : []);
        }
        if (analyticsRes.ok) {
          const data = await analyticsRes.json();
          setAnalytics(data);
        }

        const dbRes = await fetch('/api/dashboards');
        if (dbRes.ok) {
          const data = await dbRes.json();
          setSavedDashboards(data.dashboards || []);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered reports based on date range
  const filteredReports = useMemo(() => {
    if (dateRange === 'all') return reports;
    const now = new Date();
    const daysMap: Record<'week' | 'month', number> = { week: 7, month: 30 };
    const daysBack = daysMap[dateRange];
    const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    return reports.filter((r) => new Date(r.created_at) >= cutoffDate);
  }, [reports, dateRange]);

  // Calculate stats
  const filteredStats = useMemo(() => {
    const total = filteredReports.length;
    const resolved = filteredReports.filter((r) => r.status === 'SELESAI').length;
    const pending = filteredReports.filter(
      (r) => r.status === 'MENUNGGU_FEEDBACK'
    ).length;
    const highSeverity = filteredReports.filter(
      (r) => r.severity === 'high' || r.severity === 'urgent'
    ).length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    return { total, resolved, pending, highSeverity, resolutionRate };
  }, [filteredReports]);

  // Drilldown URL helper
  const drilldownUrl = (type: string, value: string) =>
    `/dashboard/analyst/drilldown?type=${type}&value=${encodeURIComponent(
      value
    )}&period=${dateRange}`;

  // Customer Feedback Dashboard shortcut handler
  const handleCustomerFeedbackShortcut = useCallback(async () => {
    setCfLoading(true);
    try {
      const cachedSlug = localStorage.getItem('cf_dashboard_slug');

      if (cachedSlug) {
        const checkRes = await fetch(`/api/dashboards?slug=${cachedSlug}`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.dashboards?.length > 0) {
            router.push(`/embed/custom/${cachedSlug}`);
            return;
          }
        }
        localStorage.removeItem('cf_dashboard_slug');
      }

      const res = await fetch('/api/dashboards/customer-feedback-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) throw new Error('Failed to generate dashboard');

      const data = await res.json();
      if (data.dashboard?.slug) {
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

  // Filter options
  const availableOptions = useMemo(() => {
    const hubs = new Set<string>();
    const branches = new Set<string>();
    const airlines = new Set<string>();
    const categories = new Set<string>();

    reports.forEach((r) => {
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
      categories: Array.from(categories).sort(),
    };
  }, [reports]);

  const existingFolders = useMemo(
    () =>
      Array.from(
        new Set(
          savedDashboards
            .map((d) => d.folder)
            .filter((f): f is string => !!f)
        )
      ),
    [savedDashboards]
  );

  // Handle filter apply
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

  // Handle triage submit
  const handleTriageSubmit = async (data: {
    primary_tag: string;
    sub_category_note: string;
    target_division: string;
  }) => {
    if (!triageReport) return;

    try {
      const res = await fetch(`/api/reports/${triageReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_tag: data.primary_tag,
          sub_category_note: data.sub_category_note,
          target_division: data.target_division,
          status: 'MENUNGGU_FEEDBACK',
        }),
      });

      if (!res.ok) throw new Error('Failed to update report');

      await fetchData(true);
      setIsTriageOpen(false);
      setTriageReport(null);
    } catch (error) {
      console.error('Triage update failed:', error);
      alert('Gagal update laporan');
    }
  };

  // Export handlers
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

  // Handle stat card click
  const handleStatClick = (type: string) => {
    switch (type) {
      case 'total':
        router.push(drilldownUrl('severity', 'all'));
        break;
      case 'resolved':
        router.push(drilldownUrl('status', 'SELESAI'));
        break;
      case 'pending':
        router.push(drilldownUrl('status', 'MENUNGGU_FEEDBACK'));
        break;
      case 'high':
        router.push(drilldownUrl('severity', 'high'));
        break;
    }
  };

  // Analytics data calculations
  const caseCategoryData = useMemo(() => {
    const irregularity = filteredReports.filter(
      (r) => r.category === 'Irregularity'
    ).length;
    const complaint = filteredReports.filter(
      (r) => r.category === 'Complaint'
    ).length;
    const compliment = filteredReports.filter(
      (r) => r.category === 'Compliment'
    ).length;
    return [
      { name: 'Irregularity', value: irregularity, fill: '#10b981' },
      { name: 'Complaint', value: complaint, fill: '#ec4899' },
      { name: 'Compliment', value: compliment, fill: '#06b6d4' },
    ];
  }, [filteredReports]);

  const branchReportData = useMemo(() => {
    const stations: Record<string, number> = {};
    filteredReports.forEach((r) => {
      const station = r.stations?.code || 'Unknown';
      stations[station] = (stations[station] || 0) + 1;
    });
    return Object.entries(stations)
      .map(([station, count]) => ({ station, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredReports]);

  const monthlyReportData = useMemo(() => {
    const dataMap = new Map<
      string,
      { irregularity: number; complaint: number; compliment: number; date: Date }
    >();

    filteredReports.forEach((r) => {
      const d = new Date(r.created_at);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (!dataMap.has(key)) {
        dataMap.set(key, {
          irregularity: 0,
          complaint: 0,
          compliment: 0,
          date: d,
        });
      }
      const entry = dataMap.get(key)!;

      if (r.category === 'Irregularity') entry.irregularity++;
      else if (r.category === 'Complaint') entry.complaint++;
      else if (r.category === 'Compliment') entry.compliment++;
    });

    const result = Array.from(dataMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, val]) => ({
        month: `${val.date.getFullYear()} ${val.date.toLocaleString('en-US', {
          month: 'short',
        })}`,
        irregularity: val.irregularity,
        complaint: val.complaint,
        compliment: val.compliment,
      }))
      .slice(-14);
    
    console.log('[AnalystPage] monthlyReportData:', result.length, 'items');
    return result;
  }, [filteredReports]);

  const categoryByAreaData = useMemo(() => {
    const areas: Record<string, number> = {};
    filteredReports.forEach((r) => {
      const area = r.area || 'General';
      areas[area] = (areas[area] || 0) + 1;
    });
    const sorted = Object.entries(areas)
      .map(([area, count]) => ({ name: area, value: count }))
      .sort((a, b) => b.value - a.value);
    const fills = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
    return sorted
      .slice(0, 5)
      .map((item, i) => ({ ...item, fill: fills[i % fills.length] }));
  }, [filteredReports]);

  const categoryByBranchData = useMemo(() => {
    const branchData: Record<
      string,
      { irregularity: number; complaint: number; compliment: number }
    > = {};
    filteredReports.forEach((r) => {
      const branch = r.stations?.code || 'Unknown';
      if (!branchData[branch])
        branchData[branch] = { irregularity: 0, complaint: 0, compliment: 0 };
      if (r.category === 'Irregularity') branchData[branch].irregularity++;
      else if (r.category === 'Complaint') branchData[branch].complaint++;
      else if (r.category === 'Compliment') branchData[branch].compliment++;
    });
    return Object.entries(branchData)
      .map(([branch, data]) => ({ branch, ...data }))
      .sort(
        (a, b) =>
          b.irregularity +
          b.complaint +
          b.compliment -
          (a.irregularity + a.complaint + a.compliment)
      )
      .slice(0, 10);
  }, [filteredReports]);

  const areaSubCategoryData = useMemo(() => {
    const dataMap: Record<string, Record<string, number>> = {};

    filteredReports.forEach((r) => {
      const area = r.area || 'General';
      const subCat = r.category || 'Uncategorized';

      if (!dataMap[area]) dataMap[area] = {};
      dataMap[area][subCat] = (dataMap[area][subCat] || 0) + 1;
    });

    return Object.entries(dataMap).map(([area, counts]) => ({
      area,
      ...counts,
    }));
  }, [filteredReports]);

  const categoryByAirlinesData = useMemo(() => {
    const airlinesData: Record<
      string,
      { irregularity: number; complaint: number; compliment: number }
    > = {};
    filteredReports.forEach((r) => {
      const airline = r.airlines || 'Unknown';
      if (!airlinesData[airline])
        airlinesData[airline] = { irregularity: 0, complaint: 0, compliment: 0 };
      if (r.category === 'Irregularity') airlinesData[airline].irregularity++;
      else if (r.category === 'Complaint') airlinesData[airline].complaint++;
      else if (r.category === 'Compliment') airlinesData[airline].compliment++;
    });
    return Object.entries(airlinesData)
      .map(([airline, data]) => ({ airline, ...data }))
      .sort(
        (a, b) =>
          b.irregularity +
          b.complaint +
          b.compliment -
          (a.irregularity + a.complaint + a.compliment)
      )
      .slice(0, 8);
  }, [filteredReports]);

  const topReportersData = useMemo(() => {
    const reporterMap: Record<
      string,
      { name: string; station: string; count: number }
    > = {};
    filteredReports.forEach((r) => {
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

  const monthlyComparisonData = useMemo(() => {
    const dataMap = new Map<
      string,
      { masuk: number; selesai: number; date: Date }
    >();

    filteredReports.forEach((r) => {
      const dCreated = new Date(r.created_at);
      if (!isNaN(dCreated.getTime())) {
        const keyCreated = `${dCreated.getFullYear()}-${String(
          dCreated.getMonth() + 1
        ).padStart(2, '0')}`;
        if (!dataMap.has(keyCreated))
          dataMap.set(keyCreated, { masuk: 0, selesai: 0, date: dCreated });
        dataMap.get(keyCreated)!.masuk++;
      }

      if (r.resolved_at) {
        const dResolved = new Date(r.resolved_at);
        if (!isNaN(dResolved.getTime())) {
          const keyResolved = `${dResolved.getFullYear()}-${String(
            dResolved.getMonth() + 1
          ).padStart(2, '0')}`;
          if (!dataMap.has(keyResolved))
            dataMap.set(keyResolved, { masuk: 0, selesai: 0, date: dResolved });
          dataMap.get(keyResolved)!.selesai++;
        }
      }
    });

    return Array.from(dataMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, val]) => {
        const rate = val.masuk > 0 ? Math.round((val.selesai / val.masuk) * 100) : 0;
        return {
          month: `${val.date.getFullYear()} ${val.date.toLocaleString('en-US', {
            month: 'short',
          })}`,
          masuk: val.masuk,
          selesai: val.selesai,
          rate,
        };
      })
      .slice(-14);
  }, [filteredReports]);

  const hubDistributionData = useMemo(() => {
    const hubMap: Record<string, number> = {};
    filteredReports.forEach((r) => {
      const hub = r.hub || 'Unknown';
      hubMap[hub] = (hubMap[hub] || 0) + 1;
    });
    return Object.entries(hubMap)
      .map(([hub, count]) => ({ hub, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredReports]);

  const resolutionByBranchData = useMemo(() => {
    const branchMap: Record<string, { total: number; resolved: number }> = {};
    filteredReports.forEach((r) => {
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

  // Case Report by Area: Branch → Airlines hierarchy, counts by area type
  const caseReportByAreaData = useMemo(() => {
    const branchMap: Record<string, Record<string, { terminal: number; apron: number; general: number }>> = {};
    filteredReports.forEach((r) => {
      const branch = r.branch || r.stations?.code || 'Unknown';
      const airline = (r.airlines || (r as any).airline || 'Unknown').trim() || 'Unknown';
      const area = (r.area || '').toLowerCase();
      if (!branchMap[branch]) branchMap[branch] = {};
      if (!branchMap[branch][airline]) branchMap[branch][airline] = { terminal: 0, apron: 0, general: 0 };
      if (area.includes('terminal')) branchMap[branch][airline].terminal++;
      else if (area.includes('apron')) branchMap[branch][airline].apron++;
      else if (area.includes('general')) branchMap[branch][airline].general++;
    });
    return Object.entries(branchMap)
      .map(([branch, airlineData]) => {
        const airlines = Object.entries(airlineData)
          .map(([name, c]) => ({
            name,
            terminal: c.terminal,
            apron: c.apron,
            general: c.general,
            total: c.terminal + c.apron + c.general,
          }))
          .sort((a, b) => b.total - a.total);
        return {
          branch,
          airlines,
          totalTerminal: Object.values(airlineData).reduce((s, v) => s + v.terminal, 0),
          totalApron: Object.values(airlineData).reduce((s, v) => s + v.apron, 0),
          totalGeneral: Object.values(airlineData).reduce((s, v) => s + v.general, 0),
          grandTotal: Object.values(airlineData).reduce((s, v) => s + v.terminal + v.apron + v.general, 0),
        };
      })
      .sort((a, b) => b.grandTotal - a.grandTotal);
  }, [filteredReports]);

  // Terminal Area Category counts sorted descending
  const terminalAreaCategoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredReports.forEach((r) => {
      const cat = (r as any).terminal_area_category as string | undefined;
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredReports]);

  // Apron Area Category counts sorted descending
  const apronAreaCategoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredReports.forEach((r) => {
      const cat = (r as any).apron_area_category as string | undefined;
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredReports]);

  // General Category counts sorted descending
  const generalCategoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredReports.forEach((r) => {
      const cat = (r as any).general_category as string | undefined;
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredReports]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div
          className="w-12 h-12 rounded-full border-4 animate-spin"
          style={{
            borderColor: 'var(--surface-4)',
            borderTopColor: 'var(--brand-primary)',
          }}
        />
        <p className="text-sm text-[var(--text-muted)] mt-4 uppercase tracking-widest font-bold">
          Loading Dashboard...
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `
          linear-gradient(oklch(0.65 0.18 160 / 0.03) 1px, transparent 1px),
          linear-gradient(90deg, oklch(0.65 0.18 160 / 0.03) 1px, transparent 1px),
          radial-gradient(circle at 0% 0%, oklch(0.65 0.18 160 / 0.08) 0%, transparent 40%),
          radial-gradient(circle at 100% 100%, oklch(0.58 0.2 162 / 0.06) 0%, transparent 40%)
        `,
        backgroundSize: '24px 24px, 24px 24px, 100% 100%, 100% 100%',
        backgroundPosition: '0 0, 0 0, 0 0, 0 0',
        backgroundColor: 'var(--surface-0)',
      }}
    >
      {/* Full-bleed analyst dashboard container */}
      <div className="space-y-8 pb-24 pt-0 px-4 md:px-6 w-full max-w-none">
        {/* Header Section */}
        <PresentationSlide className="!p-0 !min-h-0 !bg-transparent !shadow-none !border-0">
          <ResponsiveHeader
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onRefresh={() => fetchData(true)}
            refreshing={refreshing}
            onCustomerFeedback={handleCustomerFeedbackShortcut}
            cfLoading={cfLoading}
            onFilterClick={() => setShowFilterModal(true)}
            onExportExcel={exportToExcel}
            onExportPDF={exportToPDF}
            exporting={exporting}
          />
        </PresentationSlide>

        {/* Body: Stats (left) + Table (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
          <div className="lg:col-span-2">
            <PresentationSlide className="!p-0 !min-h-0 !bg-transparent !shadow-none !border-0">
              <ResponsiveStatsGrid
                stats={filteredStats}
                onStatClick={handleStatClick}
                compact
              />
            </PresentationSlide>
          </div>
          <div className="lg:col-span-3">
            <ReportsTableSection
              reports={filteredReports}
              dateRange={dateRange}
              onViewReport={setSelectedReport}
              onTriageReport={(report) => {
                setTriageReport(report);
                setIsTriageOpen(true);
              }}
              drilldownUrl={drilldownUrl}
            />
          </div>
        </div>

        {/* Charts */}
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
          caseReportByAreaData={caseReportByAreaData}
          terminalAreaCategoryData={terminalAreaCategoryData}
          apronAreaCategoryData={apronAreaCategoryData}
          generalCategoryData={generalCategoryData}
          onDrilldown={(url) => router.push(url)}
          drilldownUrl={drilldownUrl}
        />

        {/* Modals */}
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
          existingFolders={existingFolders}
        />

        <TriageModal
          isOpen={isTriageOpen}
          onClose={() => {
            setIsTriageOpen(false);
            setTriageReport(null);
          }}
          report={triageReport}
          onSubmit={handleTriageSubmit}
        />
      </div>
    </div>
  );
}
