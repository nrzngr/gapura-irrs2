'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChartPreview } from '@/components/builder/ChartPreview';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, ChevronDown as ChevronDownIcon, X, Download, FileSpreadsheet, Presentation, ExternalLink, Menu } from 'lucide-react';
import { DynamicFilterHeader, type FilterData } from '@/components/builder/DynamicFilterHeader';
import { exportToXlsx, exportToPptx } from '@/lib/dashboard-export';
import { processQuery } from '@/lib/engine/query-processor';
import { useReportsData } from '@/hooks/use-reports-cache';
import type { ChartVisualization, QueryResult, QueryDefinition, ChartType } from '@/types/builder';

// ─── Green Branding Palette ─────────────────────────────────────────────────
const GAPURA_GREEN = '#6b8e3d';
const GAPURA_BANNER = '#5a7a3a';
const GREEN_PALETTE = ['#7cb342', '#558b2f', '#aed581', '#33691e', '#9ccc65', '#689f38', '#c5e1a5', '#43a047', '#81c784', '#4caf50'];

// Filter fields that can be interactive
const FILTER_FIELDS = [
  { key: 'hub', label: 'HUB', table: 'reports', field: 'hub' },
  { key: 'branch', label: 'Branch', table: 'reports', field: 'branch' },
  { key: 'maskapai', label: 'Maskapai', table: 'reports', field: 'jenis_maskapai' },
  { key: 'airline', label: 'Airlines', table: 'reports', field: 'airlines' },
  { key: 'main_category', label: 'Kategori', table: 'reports', field: 'category' },
  { key: 'area', label: 'Area', table: 'reports', field: 'area' },
  { key: 'target_division', label: 'Divisi', table: 'reports', field: 'target_division' },
  { key: 'severity', label: 'Severity', table: 'reports', field: 'severity' },
  { key: 'status', label: 'Status', table: 'reports', field: 'status' },
];

interface ChartData {
  id: string;
  title: string;
  chart_type: string;
  data_field: string;
  width: string;
  position: number;
  query_config?: QueryDefinition;
  visualization_config?: ChartVisualization;
  layout?: { x: number; y: number; w: number; h: number };
  page_name?: string;
}

interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  config: {
    dateRange?: string;
    autoRefresh?: boolean;
    dateFrom?: string;
    dateTo?: string;
    subtitle?: string;
    filters?: string[];
    pages?: string[];
  };
  dashboard_charts: ChartData[];
}

interface ChartResult {
  type: 'legacy' | 'query';
  stats?: {
    distribution: { name: string; count: number; percentage: number }[];
    totalCount: number;
    trendData: { date: string; count: number }[];
  };
  queryResult?: QueryResult;
}

/** Force green palette on any visualization config */
function greenify(viz: ChartVisualization): ChartVisualization {
  return { ...viz, colors: GREEN_PALETTE };
}

type ActiveFilters = FilterData;

export function CustomDashboardContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;
  const range = searchParams.get('range') || '7d';

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [chartsData, setChartsData] = useState<Map<string, ChartResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dashboardRef = useRef<Dashboard | null>(null);

  // Date range
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Multi-page navigation
  const [activePage, setActivePage] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // L1 Cache: Fetch all reports for client-side processing
  const { reports: allReports, isLoading: reportsLoading } = useReportsData('/api/admin/reports');

  // Interactive filters
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [exportingFormat, setExportingFormat] = useState<'xlsx' | 'pptx' | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ─── HANDLERS ─────────────────────────────────────────────────────────────

  const handleViewDetail = (
    chartTitle: string, 
    data: Record<string, unknown>[], 
    chartType: string, 
    config?: { xAxis?: string, yAxis?: string[], metric?: string },
    queryConfig?: QueryDefinition
  ) => {
    // Apply current filters to the query config if provided, otherwise use default
    const fullQuery = queryConfig 
      ? applyFiltersToQuery(queryConfig)
      : {
          source: 'reports',
          joins: [],
          dimensions: [], 
          measures: [],
          filters: [], 
          sorts: [],
          limit: 1000
        };

    // Basic tile construction for detail view
    const detailData = {
      tile: {
        id: `chart-${Date.now()}`,
        visualization: {
          chartType: chartType,
          title: chartTitle,
          // Use provided config or fallback to heuristics
          xAxis: config?.xAxis || (data[0] ? Object.keys(data[0])[0] : ''), 
          yAxis: config?.yAxis || (data[0] ? [Object.keys(data[0])[1]] : []),
          colorField: config?.metric, // Pass the metric as colorField for Heatmap
          showLegend: true,
          showLabels: false
        },
        query: fullQuery,
        layout: { x: 0, y: 0, w: 6, h: 3 }
      },
      result: {
        columns: data[0] ? Object.keys(data[0]) : [],
        rows: data,
        rowCount: data.length,
        executionTimeMs: 0
      },
      dashboardId: 'custom-dashboard', // Generic ID
      timestamp: Date.now()
    };
    
    sessionStorage.setItem('chartDetailData', JSON.stringify(detailData));
    
    // Navigate to detail page
    const params = new URLSearchParams();
    params.set('dashboardId', 'custom-dashboard');
    params.set('tileId', detailData.tile.id);
    
    router.push(`/dashboard/chart-detail?${params.toString()}`);
  };

  // Filters are now handled by DynamicFilterHeader

  // ─── Data fetching ──────────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboards?slug=${slug}&t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      });
      if (!res.ok) throw new Error('Dashboard not found');
      const data = await res.json();
      setDashboard(data);
      if (data.config?.dateFrom) setDateFrom(data.config.dateFrom);
      if (data.config?.dateTo) setDateTo(data.config.dateTo);
      return data as Dashboard;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      return null;
    }
  }, [slug]);

  /** Apply active filters to a query config */
  const applyFiltersToQuery = useCallback((queryConfig: QueryDefinition): QueryDefinition => {
    const extraFilters = Object.entries(activeFilters)
      .filter(([, val]) => val && val !== 'all')
      .map(([key, val]) => {
        const ff = FILTER_FIELDS.find(f => f.key === key);
        return ff ? {
          table: ff.table,
          field: ff.field,
          operator: 'eq' as const,
          value: val,
          conjunction: 'AND' as const,
        } : null;
      })
      .filter(Boolean);

    // Date filters
    const dateFilters = [];
    if (dateFrom) {
      dateFilters.push({
        table: 'reports',
        field: 'created_at',
        operator: 'gte' as const,
        value: dateFrom,
        conjunction: 'AND' as const,
      });
    }
    if (dateTo) {
      dateFilters.push({
        table: 'reports',
        field: 'created_at',
        operator: 'lte' as const,
        value: dateTo,
        conjunction: 'AND' as const,
      });
    }

    return {
      ...queryConfig,
      joins: queryConfig.joins || [],
      dimensions: queryConfig.dimensions || [],
      measures: queryConfig.measures || [],
      sorts: queryConfig.sorts || [],
      filters: [
        ...(queryConfig.filters || []),
        ...extraFilters.filter((f): f is NonNullable<typeof f> => f !== null),
        ...dateFilters,
      ],
    };
  }, [activeFilters, dateFrom, dateTo]);

  const fetchChartData = useCallback(async (charts: ChartData[]): Promise<Map<string, ChartResult>> => {
    const dataMap = new Map<string, ChartResult>();

    // Separate query-based charts from legacy charts
    const queryCharts = charts.filter(c => c.query_config);
    const legacyCharts = charts.filter(c => !c.query_config);

    // Identify which charts can be processed client-side (L1 Cache) vs Server-side
    const serverQueryCharts: typeof queryCharts = [];

    // Process client-side queries if data is available
    if (allReports.length > 0) {
      for (const chart of queryCharts) {
        const query = applyFiltersToQuery(chart.query_config!);
        const source = (query.source || 'reports').toLowerCase();
        
        if (source === 'reports') {
          try {
            // Execute query against cached data
            const result = processQuery(query, allReports);
            dataMap.set(chart.id, { 
              type: 'query', 
              queryResult: result 
            });
          } catch (err) {
            console.error(`[Dashboard] Client query "${chart.id}" failed:`, err);
            // Fallback to server if client processing fails
            serverQueryCharts.push(chart);
          }
        } else {
          serverQueryCharts.push(chart);
        }
      }
    } else {
      // If reports not yet loaded, send all to server (or wait? better to fallback to server for first load if urgent)
      // Actually, if we want to enforce cache usage, we should wait. 
      // But for better UX, if cache is empty, we might want to fetch from server (which hits L2 cache).
      // However, to strictly follow "70% reduction", let's prioritize client processing.
      // If reportsLoading is true, we might just be waiting.
      // If we push to serverQueryCharts here, we use L2 cache.
      serverQueryCharts.push(...queryCharts);
    }

    // Batch fetch remaining query-based charts in a single request
    const batchPromise = serverQueryCharts.length > 0
      ? (async () => {
          try {
            const batchQueries = serverQueryCharts.map(chart => ({
              id: chart.id,
              query: applyFiltersToQuery(chart.query_config!),
            }));
            const res = await fetch('/api/dashboards/query/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ queries: batchQueries }),
            });
            if (res.ok) {
              const { results } = await res.json();
              for (const r of results) {
                if (!r.error) {
                  dataMap.set(r.id, { type: 'query', queryResult: { columns: r.columns, rows: r.rows, rowCount: r.rowCount, executionTimeMs: 0 } });
                } else {
                  console.error(`[Dashboard] Chart query "${r.id}" failed:`, r.error);
                }
              }
            } else {
              const errBody = await res.text();
              console.error(`[Dashboard] Batch query failed (${res.status}):`, errBody);
            }
          } catch (err) { console.error('[Dashboard] Batch fetch error:', err); }
        })()
      : Promise.resolve();

    // Fetch legacy charts in parallel (these use a different API)
    const legacyPromise = Promise.all(
      legacyCharts.map(async (chart) => {
        try {
          const res = await fetch(`/api/embed/stats?type=${chart.data_field}&range=${range}`);
          if (res.ok) {
            const data = await res.json();
            dataMap.set(chart.id, { type: 'legacy', stats: data });
          } else {
            console.error(`[Dashboard] Legacy chart "${chart.id}" failed (${res.status})`);
          }
        } catch (err) { console.error('[Dashboard] Legacy fetch error:', err); }
      })
    );

    await Promise.all([batchPromise, legacyPromise]);
    setChartsData(prev => {
        const next = new Map(prev);
        dataMap.forEach((v, k) => next.set(k, v));
        return next;
    });
    return dataMap;
  }, [range, applyFiltersToQuery, allReports]);

  /** Extract the charts for a specific page index from a dashboard */
  const getPageCharts = useCallback((dash: Dashboard, pageIdx: number): ChartData[] => {
    const charts = dash.dashboard_charts;
    const hasPages = charts.some(c => c.page_name && c.page_name !== 'Ringkasan Umum');
    const configPages = dash.config?.pages;

    if (hasPages || (configPages && configPages.length > 1)) {
      const pageMap = new Map<string, ChartData[]>();
      const pageOrder = configPages || [];
      for (const pn of pageOrder) pageMap.set(pn, []);
      for (const chart of charts) {
        const pageName = chart.page_name || 'Ringkasan Umum';
        if (!pageMap.has(pageName)) pageMap.set(pageName, []);
        pageMap.get(pageName)!.push(chart);
      }
      const pagesArr = Array.from(pageMap.entries()).filter(([, t]) => t.length > 0);
      const target = pagesArr[pageIdx];
      return target ? target[1] : charts;
    }
    return charts;
  }, []);

  // Initial load — only fetch ACTIVE PAGE charts (avoids >30 batch limit)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const dash = await fetchDashboard();
      if (dash) {
        dashboardRef.current = dash;
      }
      setLoading(false);
    };
    load();
  }, [slug, fetchDashboard]);

  // Re-fetch data when page changes or filters change — only fetch active page
  useEffect(() => {
    if (dashboardRef.current?.dashboard_charts) {
      const pageCharts = getPageCharts(dashboardRef.current, activePage);
      fetchChartData(pageCharts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, activeFilters, dateFrom, dateTo]);

  // ─── Computed: pages ──────────────────────────────────────────────────────
  const pages = useMemo(() => {
    if (!dashboard) return [];
    const charts = dashboard.dashboard_charts;

    // Check if charts have page_name
    const hasPages = charts.some(c => c.page_name && c.page_name !== 'Ringkasan Umum');
    const configPages = dashboard.config?.pages;

    if (hasPages || (configPages && configPages.length > 1)) {
      // Group by page_name
      const pageMap = new Map<string, ChartData[]>();
      const pageOrder = configPages || [];

      // First, init with config page order
      for (const pn of pageOrder) {
        pageMap.set(pn, []);
      }

      for (const chart of charts) {
        const pageName = chart.page_name || 'Ringkasan Umum';
        if (!pageMap.has(pageName)) pageMap.set(pageName, []);
        pageMap.get(pageName)!.push(chart);
      }

      return Array.from(pageMap.entries())
        .filter(([, tiles]) => tiles.length > 0)
        .map(([name, tiles]) => ({
          name,
          tiles: tiles.sort((a, b) => a.position - b.position),
        }));
    }

    // Single page fallback
    return [{
      name: 'Ringkasan Umum',
      tiles: [...charts].sort((a, b) => a.position - b.position),
    }];
  }, [dashboard]);

  // Auto-refresh: pause when tab is hidden, only refresh active page charts, 5min interval
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden) return;
      if (!dashboardRef.current?.dashboard_charts) return;
      const currentPageCharts = pages[activePage]?.tiles || dashboardRef.current.dashboard_charts;
      await fetchChartData(currentPageCharts);
    }, 300000);
    return () => clearInterval(interval);
  }, [fetchChartData, pages, activePage]);

  // ─── Computed stats ─────────────────────────────────────────────────────────
  const kpiTiles = useMemo(() => {
    if (pages.length === 0) return [];
    const currentPage = pages[activePage] || pages[0];
    return currentPage.tiles.filter(c => c.visualization_config?.chartType === 'kpi');
  }, [pages, activePage]);

  const contentTiles = useMemo(() => {
    if (pages.length === 0) return [];
    const currentPage = pages[activePage] || pages[0];
    return currentPage.tiles.filter(c => c.visualization_config?.chartType !== 'kpi');
  }, [pages, activePage]);

  const totalReport = useMemo(() => {
    let total = 0;
    chartsData.forEach((cr) => {
      if (cr.type === 'query' && cr.queryResult) {
        (cr.queryResult.rows as Record<string, unknown>[]).forEach(row => {
          Object.values(row).forEach(v => {
            const n = Number(v);
            if (!isNaN(n) && n > total) total = n;
          });
        });
      }
      if (cr.type === 'legacy' && cr.stats && cr.stats.totalCount > total) total = cr.stats.totalCount;
    });
    return total;
  }, [chartsData]);

  const formatDateRange = () => {
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      return `${from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return 'Select date range';
  };

  const activeFilterCount = Object.values(activeFilters).filter(v => v).length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  // Complexity: Time O(pages * tiles) | Space O(export_payload)
  const handleExport = useCallback(async (format: 'xlsx' | 'pptx') => {
    if (!dashboard) return;
    setExportingFormat(format);
    setShowExportMenu(false);
    try {
      // Pre-fetch ALL pages' chart data (unvisited pages may lack data)
      const allCharts = pages.flatMap(p => p.tiles);
      const missingCharts = allCharts.filter(t => !chartsData.has(t.id));

      // Build complete chart data map: current state + newly fetched
      let completeChartsData = chartsData;
      if (missingCharts.length > 0) {
        const freshData = await fetchChartData(missingCharts);
        completeChartsData = new Map(chartsData);
        freshData.forEach((v, k) => completeChartsData.set(k, v));
      }

      const exportPages = pages.map(p => ({
        name: p.name,
        tiles: p.tiles.map(t => ({
          id: t.id,
          title: t.title,
          chartType: t.visualization_config?.chartType || t.chart_type || 'bar',
          yAxis: t.visualization_config?.yAxis,
        })),
      }));
      const payload = {
        dashboardName: dashboard.name,
        subtitle: dashboard.description || dashboard.config?.subtitle,
        dashboardId: dashboard.id,
        baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
        pages: exportPages,
        chartsData: completeChartsData,
      };
      if (format === 'xlsx') await exportToXlsx(payload);
      else await exportToPptx(payload);
    } catch (err) {
      console.error(`[Dashboard] Export ${format} error:`, err);
    } finally {
      setExportingFormat(null);
    }
  }, [dashboard, pages, chartsData, fetchChartData]);

  // ─── Loading / Error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif" }}>
        {/* Sidebar skeleton */}
        <div style={{ width: 240, background: '#fff', borderRight: '1px solid #e0e0e0', padding: 16, flexShrink: 0 }}>
          <div style={{ width: 80, height: 40, background: '#f0f0f0', borderRadius: 6, marginBottom: 20 }} className="animate-pulse" />
          {[1,2,3,4].map(i => (
            <div key={i} style={{ width: '100%', height: 32, background: '#f5f5f5', borderRadius: 6, marginBottom: 6 }} className="animate-pulse" />
          ))}
        </div>
        {/* Main content skeleton */}
        <div style={{ flex: 1, background: '#f5f5f5' }}>
          {/* Header skeleton */}
          <div style={{ background: '#fff', padding: '16px 24px', borderBottom: '1px solid #e0e0e0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div style={{ width: 60, height: 40, background: '#f0f0f0', borderRadius: 6 }} className="animate-pulse" />
              <div style={{ width: 200, height: 24, background: '#f0f0f0', borderRadius: 6 }} className="animate-pulse" />
            </div>
            <div style={{ width: '100%', height: 36, background: '#e8ede4', borderRadius: 4 }} className="animate-pulse" />
            {/* KPI skeletons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ width: 60, height: 12, background: '#f0f0f0', borderRadius: 4, margin: '0 auto 8px' }} className="animate-pulse" />
                  <div style={{ width: 80, height: 28, background: '#f0f0f0', borderRadius: 4, margin: '0 auto' }} className="animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          {/* Chart tile skeletons */}
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-gray-100">
                    <div className="w-32 h-4 bg-gray-100 rounded animate-pulse" />
                  </div>
                  <div className="p-4 h-[200px]">
                    <div className="w-full h-full bg-gray-50 rounded-md animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-6">
        <AlertCircle size={48} className="text-gray-300 mb-4" />
        <h3 className="text-lg font-bold text-gray-700">Dashboard tidak ditemukan</h3>
        <p className="text-xs text-gray-400 mt-1">{slug}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-6 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  const hasMultiplePages = pages.length > 1;

  return (
    <div className="flex min-h-screen font-sans bg-gray-50 text-gray-900 overflow-x-hidden">
      {/* ── SIDEBAR (only if multi-page) ── */}
      {/* ── SIDEBAR (Responsive) ── */}
      {hasMultiplePages && (
        <>
          {/* Mobile Overlay */}
          <div 
            className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setMobileMenuOpen(false)}
          />

          <div
            className={`
              fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 flex flex-col
              transform transition-all duration-300 ease-in-out shadow-xl md:shadow-none
              md:translate-x-0 md:static md:h-screen md:sticky md:top-0
              ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
              ${sidebarCollapsed ? 'md:w-[60px]' : 'md:w-64'}
              w-64
            `}
          >
            {/* Sidebar Header */}
            <div className={`
              flex items-center gap-2 border-b border-gray-100
              ${sidebarCollapsed ? 'p-3 justify-center' : 'p-4'}
            `}>
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="relative h-8 w-8 shrink-0">
                  <Image src="/logo.png" alt="Gapura" fill style={{ objectFit: 'contain' }} />
                </div>
              )}
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <span className="font-bold text-gray-700 text-sm whitespace-nowrap overflow-hidden">
                  Gapura IRRS
                </span>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden md:flex ml-auto text-gray-400 hover:text-gray-600 p-1"
              >
                {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="md:hidden ml-auto text-gray-400 hover:text-gray-600 p-1"
              >
                <ChevronLeft size={20} />
              </button>
            </div>

            {/* Page Navigation */}
            <div className={`flex-1 overflow-y-auto ${sidebarCollapsed ? 'p-2' : 'p-3'}`}>
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Halaman
                </div>
              )}
              <div className="space-y-1">
                {pages.map((page, idx) => {
                  const isActive = activePage === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setActivePage(idx);
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 rounded-lg text-left transition-all duration-200 group
                        ${sidebarCollapsed ? 'p-2 justify-center' : 'px-3 py-2.5'}
                        ${isActive 
                          ? 'bg-[#6b8e3d] text-white shadow-sm' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                      title={page.name}
                    >
                      <span className={`
                        flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold shrink-0 transition-colors
                        ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}
                      `}>
                        {idx + 1}
                      </span>
                      {(!sidebarCollapsed || mobileMenuOpen) && (
                        <span className="text-sm font-medium truncate">{page.name}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Filters Summary in Sidebar */}
            {(!sidebarCollapsed || mobileMenuOpen) && activeFilterCount > 0 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Filter Aktif ({activeFilterCount})
                </div>
                <button
                  onClick={() => { setActiveFilters({}); setDateFrom(''); setDateTo(''); }}
                  className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                >
                  <X size={12} /> Reset Filter
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 min-w-0 bg-gray-50 flex flex-col">
        {/* ── HEADER ── */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm md:shadow-none">
          <div className="px-4 py-4 md:px-6">
            {/* Logo + Title + Date */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                {/* Mobile Toggle */}
                {hasMultiplePages && (
                  <button 
                    onClick={() => setMobileMenuOpen(true)}
                    className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Menu size={24} />
                  </button>
                )}
                
                {!hasMultiplePages && (
                  <div className="relative h-12 w-12 shrink-0">
                    <Image src="/logo.png" alt="Gapura Airport Services" fill style={{ objectFit: 'contain' }} />
                  </div>
                )}
                
                <div className="min-w-0">
                  <h1 className="text-lg md:text-2xl font-bold text-gray-800 leading-tight truncate">
                    {(() => {
                      const pName = pages[activePage]?.name || '';
                      const cfFrom = dateFrom || dashboard?.config?.dateFrom;
                      const cfTo = dateTo || dashboard?.config?.dateTo;
                      let yr = '';
                      if (cfFrom && cfTo) {
                        const fy = new Date(cfFrom).getFullYear();
                        const ty = new Date(cfTo).getFullYear();
                        if (!isNaN(fy) && !isNaN(ty)) {
                          yr = fy === ty ? `${fy}` : `${fy} - ${ty}`;
                        }
                      }
                      
                      const yearSuffix = yr ? ` ${yr}` : '';
                      
                      // Priority 1: Dashboard name from DB
                      if (dashboard?.name && !dashboard.name.toLowerCase().includes('untitled')) {
                        // If yr is already in the name, don't append it again
                        if (yr && dashboard.name.includes(yr)) return dashboard.name;
                        return `${dashboard.name}${yearSuffix}`;
                      }

                      // Priority 2: Page name context
                      if (pName.toLowerCase().includes('cgo')) return `CGO Cargo Customer Feedback${yearSuffix}`;
                      
                      // Fallback: Template name
                      return `Landside & Airside Customer Feedback${yearSuffix}`;
                    })()}
                  </h1>
                  {hasMultiplePages && pages[activePage] && (
                    <span className="text-sm text-gray-500 font-medium block mt-1 truncate">{pages[activePage].name}</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 self-end md:self-auto">
                {/* Export dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={exportingFormat !== null}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm active:scale-95"
                  >
                    {exportingFormat ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    <span className="hidden sm:inline">{exportingFormat ? 'Exporting...' : 'Export'}</span>
                    <ChevronDownIcon size={14} className="text-gray-400" />
                  </button>
                  {showExportMenu && (
                    <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[220px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <button 
                        onClick={() => handleExport('xlsx')} 
                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-green-50 text-gray-700 transition-colors border-b border-gray-50"
                      >
                        <FileSpreadsheet size={16} className="text-green-600" />
                        <span className="text-sm font-medium">Export ke Excel (.xlsx)</span>
                      </button>
                      <button 
                        onClick={() => handleExport('pptx')} 
                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-orange-50 text-gray-700 transition-colors"
                      >
                        <Presentation size={16} className="text-orange-600" />
                        <span className="text-sm font-medium">Export ke PowerPoint (.pptx)</span>
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Date range */}
                <div className="relative">
                  <button 
                    onClick={() => setShowDatePicker(!showDatePicker)} 
                    className="flex items-center gap-2 px-3 py-2 bg-[#6b8e3d] text-white rounded-lg text-sm font-medium hover:bg-[#5a7a3a] transition-all shadow-sm active:scale-95 border border-transparent"
                  >
                    <span className="truncate max-w-[120px] sm:max-w-xs">{formatDateRange()}</span>
                    <ChevronDownIcon size={14} className="text-white/80" />
                  </button>
                  {showDatePicker && (
                    <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-xl p-4 shadow-2xl z-50 min-w-[280px] flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">From</label>
                        <input 
                          type="date" 
                          value={dateFrom} 
                          onChange={e => setDateFrom(e.target.value)} 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">To</label>
                        <input 
                          type="date" 
                          value={dateTo} 
                          onChange={e => setDateTo(e.target.value)} 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all" 
                        />
                      </div>
                      <button 
                        onClick={() => setShowDatePicker(false)} 
                        className="mt-1 w-full py-2 bg-[#6b8e3d] text-white rounded-lg text-sm font-bold hover:bg-[#5a7a3a] transition-colors"
                      >
                        Apply Filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Banner with Interactive Filters */}
            <div className="bg-[#5a7a3a] rounded-xl p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm ring-1 ring-black/5">
              <span className="text-white font-bold text-sm block tracking-wide">
                Irregularity, Complain & Compliment Report
              </span>
              <div className="flex gap-2 flex-wrap items-center">
                <DynamicFilterHeader 
                  onFilterChange={setActiveFilters}
                  initialFilters={activeFilters}
                  variant="white"
                />
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(''); setDateTo(''); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium border border-white/20 hover:bg-white/20 transition-all active:scale-95"
                  >
                    <X size={12} /> Reset Date
                  </button>
                )}
              </div>
            </div>

            {/* KPI Stats Row */}
            {kpiTiles.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-6">
                {kpiTiles.slice(0, 5).map(tile => {
                  const cr = chartsData.get(tile.id);
                  let value: string | number = '-';
                  if (cr?.type === 'query' && cr.queryResult) {
                    const row = cr.queryResult.rows[0] as Record<string, unknown> | undefined;
                    if (row) {
                      const yKey = tile.visualization_config?.yAxis?.[0] || cr.queryResult.columns[cr.queryResult.columns.length - 1];
                      value = Number(row[yKey]) || 0;
                    }
                  }
                  return (
                    <div key={tile.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-1 hover:shadow-md transition-shadow">
                      <div className="text-xs font-bold text-[#6b8e3d] uppercase tracking-wider text-center">{tile.title}</div>
                      <div className="text-2xl md:text-3xl font-bold text-[#6b8e3d]">{typeof value === 'number' ? value.toLocaleString('id-ID') : value}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {kpiTiles.length === 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-1">
                  <div className="text-xs font-bold text-[#6b8e3d] uppercase tracking-wider">Total Report</div>
                  <div className="text-2xl md:text-3xl font-bold text-[#6b8e3d]">{totalReport > 0 ? totalReport.toLocaleString('id-ID') : '-'}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-1">
                  <div className="text-xs font-bold text-[#6b8e3d] uppercase tracking-wider">Halaman</div>
                  <div className="text-2xl md:text-3xl font-bold text-[#6b8e3d]">{pages.length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-1">
                  <div className="text-xs font-bold text-[#6b8e3d] uppercase tracking-wider">Total Chart</div>
                  <div className="text-2xl md:text-3xl font-bold text-[#6b8e3d]">{dashboard.dashboard_charts.length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-1">
                  <div className="text-xs font-bold text-[#6b8e3d] uppercase tracking-wider">Filter Aktif</div>
                  <div className="text-2xl md:text-3xl font-bold text-[#6b8e3d]">{activeFilterCount || '-'}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CONTENT: Chart + Detail Table Groups ── */}
        <div className="p-4 md:p-6 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-min">
            {contentTiles.map(chart => {
              const cr = chartsData.get(chart.id);
              if (!cr) return null;
              const layout = chart.layout || { w: 6, h: 2 };
              const colSpan = layout.w || 6;
              const isTableType = chart.visualization_config?.chartType === 'table';
              
              // Map legacy 12-col grid width to Tailwind classes
              // Default to spanning full width on mobile (col-span-1 in a 1-col grid), 
              // and specific span on desktop (md:col-span-X)
              let mdColSpan = 'md:col-span-6';
              if (colSpan === 12) mdColSpan = 'md:col-span-12';
              else if (colSpan >= 8) mdColSpan = 'md:col-span-8';
              else if (colSpan >= 6) mdColSpan = 'md:col-span-6';
              else if (colSpan >= 4) mdColSpan = 'md:col-span-4';
              else if (colSpan >= 3) mdColSpan = 'md:col-span-3';

              return (
                <div key={chart.id} className={`col-span-1 ${mdColSpan} flex flex-col gap-0.5`}>
                  {/* HEATMAP (specific handling) */}
                  {cr.type === 'query' && cr.queryResult && chart.visualization_config?.chartType === 'heatmap' ? (
                    <HeatmapChart
                      title={chart.title}
                      data={cr.queryResult.rows}
                      xAxis={chart.visualization_config.xAxis || 'category'}
                      yAxis={chart.visualization_config.yAxis?.length === 1 ? chart.visualization_config.yAxis[0] : (chart.visualization_config.yAxis || ['branch'])}
                      metric={chart.visualization_config.colorField || (Array.isArray(chart.visualization_config.yAxis) && chart.visualization_config.yAxis[0]) || 'Jumlah'}
                      showTitle={true}
                      onViewDetail={() => handleViewDetail(chart.title, cr.queryResult ? cr.queryResult.rows : [], 'heatmap', {
                        xAxis: chart.visualization_config?.xAxis,
                        yAxis: chart.visualization_config?.yAxis,
                        metric: chart.visualization_config?.colorField || (Array.isArray(chart.visualization_config?.yAxis) && chart.visualization_config?.yAxis[0]) || 'Jumlah'
                      }, chart.query_config)}
                    />
                  ) : !isTableType && cr.type === 'query' && cr.queryResult ? (
                    <ChartCard chart={chart} result={cr.queryResult} />
                  ) : cr.type === 'legacy' && cr.stats ? (
                    <LegacyCard chart={chart} stats={cr.stats} />
                  ) : null}

                  {/* For table type: show title header + detail table directly */}
                  {isTableType && cr.type === 'query' && cr.queryResult && cr.queryResult.rows.length > 0 && (
                    <div className="bg-white rounded-t-xl border border-gray-200 border-b-0 overflow-hidden shadow-sm">
                      <div className="px-5 py-4 flex items-center justify-between">
                        <div>
                          <h3 className="m-0 text-sm font-bold text-gray-800">{chart.title}</h3>
                          <span className="text-xs text-gray-400">{cr.queryResult.rowCount} baris</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DETAIL TABLE (only for table type charts) */}
                  {isTableType && cr.type === 'query' && cr.queryResult && cr.queryResult.rows.length > 0 && (
                    <DetailTable 
                      title={chart.title} 
                      result={cr.queryResult} 
                      onViewDetail={() => handleViewDetail(chart.title, cr.queryResult ? cr.queryResult.rows : [], 'table', {
                         xAxis: chart.visualization_config?.xAxis,
                         // For table, we might want to pass all columns, but for now this is fine since it's just 'table' type
                      }, chart.query_config)}
                    />
                  )}
                  {cr.type === 'legacy' && cr.stats && cr.stats.distribution.length > 0 && (
                    <LegacyDetailTable title={chart.title} stats={cr.stats} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── PAGE NAVIGATION (bottom) ── */}
        {hasMultiplePages && (
          <div className="px-6 pb-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setActivePage(p => Math.max(0, p - 1))}
              disabled={activePage === 0}
              className={`
                flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-600 text-xs font-semibold
                hover:bg-gray-50 active:scale-95 transition-all
                ${activePage === 0 ? 'opacity-40 cursor-not-allowed' : 'shadow-sm'}
              `}
            >
              <ChevronLeft size={16} /> Sebelumnya
            </button>
            <span className="text-xs text-gray-400 px-3 font-medium">
              Halaman {activePage + 1} / {pages.length}
            </span>
            <button
              onClick={() => setActivePage(p => Math.min(pages.length - 1, p + 1))}
              disabled={activePage >= pages.length - 1}
              className={`
                flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-600 text-xs font-semibold
                hover:bg-gray-50 active:scale-95 transition-all
                ${activePage >= pages.length - 1 ? 'opacity-40 cursor-not-allowed' : 'shadow-sm'}
              `}
            >
              Selanjutnya <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div className="sticky bottom-0 z-30 bg-white/90 backdrop-blur-md border-t border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Gapura" width={20} height={20} style={{ height: 20, objectFit: 'contain', opacity: 0.6 }} />
            <span className="text-gray-500 font-semibold tracking-wide">Gapura IRRS</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)] animate-pulse" />
              Live Data
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-400">&copy; {new Date().getFullYear()} PT Gapura Angkasa</span>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {showExportMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowExportMenu(false); }}
        />
      )}
    </div>
  );
}

// ─── CHART CARD ─────────────────────────────────────────────────────────────

function ChartCard({ chart, result }: { chart: ChartData; result: QueryResult }) {
  const router = useRouter();
  const baseViz: ChartVisualization = chart.visualization_config || {
    chartType: (chart.chart_type as ChartType) || 'bar',
    yAxis: result.columns.slice(1),
    xAxis: result.columns[0],
    showLegend: true,
    showLabels: true,
  };
  const viz = greenify(baseViz);
  const isTable = viz.chartType === 'table';

  if (isTable) return null;

  const handleViewDetail = () => {
    // Store data in sessionStorage for the detail page
    const detailData = {
      tile: {
        id: chart.id,
        visualization: viz,
        query: chart.query_config || {
          source: 'reports',
          joins: [],
          dimensions: [],
          measures: [],
          filters: [],
          sorts: [],
          limit: 1000
        },
        layout: chart.layout || { x: 0, y: 0, w: 6, h: 3 }
      },
      result: result,
      dashboardId: 'embed-dashboard',
      timestamp: Date.now()
    };
    
    sessionStorage.setItem('chartDetailData', JSON.stringify(detailData));
    
    // Navigate to detail page
    const params = new URLSearchParams();
    params.set('dashboardId', 'embed-dashboard');
    params.set('tileId', chart.id);
    
    router.push(`/dashboard/chart-detail?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-full">
      <div className="px-5 py-3 flex items-center justify-between border-b border-gray-100/50">
        <h3 className="text-sm font-bold text-gray-800 m-0">{chart.title}</h3>
        <button
          onClick={handleViewDetail}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#6b8e3d] hover:bg-[#5a7a3a] rounded transition-colors shadow-sm active:scale-95"
          title="Lihat Detail"
        >
          <ExternalLink size={12} />
          <span>Detail</span>
        </button>
      </div>
      <div className="p-4 flex-1 min-h-0 flex flex-col overflow-hidden bg-white/50 relative">
        <div className="w-full h-[400px] overflow-y-auto custom-scrollbar">
          <ChartPreview visualization={viz} result={result} />
        </div>
      </div>
    </div>
  );
}

/** Render evidence URL — handles postgres array format {url1,url2} and plain URLs */
function renderEvidenceCell(val: unknown): React.ReactNode {
  if (val === null || val === undefined) return '-';
  const str = String(val);
  // Parse postgres text array format: {url1,url2}
  let urls: string[] = [];
  if (str.startsWith('{') && str.endsWith('}')) {
    urls = str.slice(1, -1).split(',').map(u => u.trim()).filter(u => u.startsWith('http'));
  } else if (str.startsWith('http')) {
    urls = [str];
  }
  if (urls.length === 0) return str || '-';
  return (
    <span className="flex flex-col gap-1">
      {urls.map((url, i) => (
        <a 
          key={i} 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 hover:text-blue-800 underline text-[11px] transition-colors"
        >
          Evidence {urls.length > 1 ? i + 1 : ''}
        </a>
      ))}
    </span>
  );
}

// ─── LEGACY CHART CARD ──────────────────────────────────────────────────────

function LegacyCard({ chart, stats }: { chart: ChartData; stats: ChartResult['stats'] & {} }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-full">
      <div className="px-5 py-3 flex items-center justify-between border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 m-0">{chart.title}</h3>
        <span className="text-[11px] text-gray-400 font-medium">{stats.totalCount} total</span>
      </div>
      <div className="p-4 pb-5">
        <div className="flex flex-col gap-2">
          {stats.distribution.slice(0, 10).map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-5 text-right shrink-0 font-medium">{idx + 1}.</span>
              <span className="text-xs text-gray-700 flex-1 truncate">{item.name}</span>
              <span className="text-xs font-bold text-gray-800 shrink-0">{item.count}</span>
              <div className="w-20 h-3.5 bg-gray-100 rounded overflow-hidden shrink-0 relative">
                <div 
                  className="h-full bg-[#6b8e3d] rounded transition-all duration-500 ease-out" 
                  style={{ width: `${item.percentage}%` }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DETAIL TABLE (separate card, grouped with chart above) ─────────────────

function DetailTable({ title, result, onViewDetail }: { title: string; result: QueryResult; onViewDetail?: () => void }) {
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const PAGE_SIZE = 10;

  const rows = result.rows as Record<string, unknown>[];

  const sortedRows = useMemo(() => {
    if (!sortCol) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortCol] ?? '';
      const bv = b[sortCol] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [rows, sortCol, sortDir]);

  const pagedRows = sortedRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  // Max values per column for heatmap
  const maxValues = useMemo(() => {
    const max: Record<string, number> = {};
    result.columns.forEach(col => {
      let colMax = 0;
      rows.forEach(row => { const v = Number(row[col]); if (!isNaN(v) && v > colMax) colMax = v; });
      max[col] = colMax;
    });
    return max;
  }, [result.columns, rows]);

  // Grand total row
  const grandTotal = useMemo(() => {
    const totals: Record<string, number> = {};
    result.columns.forEach(col => {
      let sum = 0;
      let isNumeric = false;
      rows.forEach(row => {
        const v = Number(row[col]);
        if (!isNaN(v) && row[col] !== null && row[col] !== '' && typeof row[col] !== 'boolean') {
          sum += v;
          isNumeric = true;
        }
      });
      if (isNumeric) totals[col] = sum;
    });
    return totals;
  }, [result.columns, rows]);

  const hasNumericTotal = Object.keys(grandTotal).length > 0;

  return (
    <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 overflow-hidden shadow-sm">
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b8e3d]">Detail: {title}</span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium">{rows.length} baris</span>
          {onViewDetail && (
            <button
              onClick={onViewDetail}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-300 rounded text-[10px] sm:text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
              title="View Full Detail"
            >
              <ExternalLink size={12} />
              Detail
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse text-xs sm:text-[13px]">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left font-bold bg-[#5a7a3a] text-white text-[11px] whitespace-nowrap sticky left-0 z-10 w-12">#</th>
              {result.columns.map(col => (
                <th 
                  key={col} 
                  onClick={() => handleSort(col)} 
                  className="px-3 py-2 text-left font-bold bg-[#5a7a3a] text-white text-[11px] whitespace-nowrap cursor-pointer select-none hover:bg-[#4d6932] transition-colors"
                >
                  <span className="flex items-center gap-1">
                    {formatColumnLabel(col)}
                    {sortCol === col && <span className="text-[9px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 text-gray-400 text-[11px] whitespace-nowrap sticky left-0 bg-inherit">{page * PAGE_SIZE + idx + 1}.</td>
                {result.columns.map(col => {
                  const val = row[col];
                  const isEvidenceCol = col.toLowerCase().includes('evidence') || col.toLowerCase().includes('link');
                  if (isEvidenceCol) {
                    return <td key={col} className="px-3 py-2 text-gray-700 text-xs whitespace-nowrap">{renderEvidenceCell(val)}</td>;
                  }
                  const numVal = Number(val);
                  const isNum = !isNaN(numVal) && val !== null && val !== '' && typeof val !== 'boolean';
                  const maxVal = maxValues[col];
                  let cellBg = 'transparent';
                  if (isNum && maxVal > 0 && numVal > 0) {
                    const alpha = Math.max(0.06, Math.min(0.35, (numVal / maxVal) * 0.45));
                    cellBg = `rgba(107, 142, 61, ${alpha})`;
                  }
                  return (
                    <td 
                      key={col} 
                      className={`px-3 py-2 text-gray-700 text-xs whitespace-nowrap ${isNum ? 'text-center font-semibold' : 'text-left'}`}
                      style={{ backgroundColor: cellBg }}
                    >
                      {formatCellValue(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Grand Total Row */}
            {hasNumericTotal && (
              <tr className="border-t-2 border-[#6b8e3d] bg-[#f0f7e8]">
                <td className="px-3 py-2 font-bold text-[#6b8e3d] whitespace-nowrap sticky left-0 bg-[#f0f7e8]">∑</td>
                {result.columns.map(col => (
                  <td key={col} className={`px-3 py-2 font-bold text-[#6b8e3d] whitespace-nowrap ${grandTotal[col] !== undefined ? 'text-center' : 'text-left'}`}>
                    {grandTotal[col] !== undefined ? grandTotal[col].toLocaleString('id-ID') : 'Grand Total'}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {rows.length > PAGE_SIZE && (
        <div className="flex items-center justify-end px-4 py-2 gap-2 text-xs text-gray-500 border-t border-gray-100 bg-white">
          <span className="font-medium mr-2">{page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, rows.length)} / {rows.length}</span>
          <button 
            onClick={() => setPage(p => Math.max(0, p - 1))} 
            disabled={page === 0} 
            className={`p-1 rounded hover:bg-gray-100 transition-colors ${page === 0 ? 'text-gray-300 cursor-default' : 'text-gray-600 cursor-pointer'}`}
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} 
            disabled={page >= totalPages - 1} 
            className={`p-1 rounded hover:bg-gray-100 transition-colors ${page >= totalPages - 1 ? 'text-gray-300 cursor-default' : 'text-gray-600 cursor-pointer'}`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── LEGACY DETAIL TABLE ────────────────────────────────────────────────────

function LegacyDetailTable({ title, stats }: { title: string; stats: NonNullable<ChartResult['stats']> }) {
  return (
    <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 overflow-hidden shadow-sm">
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b8e3d]">Detail: {title}</span>
        <span className="text-[11px] text-gray-400 font-medium">{stats.totalCount} total</span>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse text-xs sm:text-[13px]">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left font-bold bg-[#5a7a3a] text-white text-[11px] whitespace-nowrap w-12 sticky left-0 z-10">#</th>
              <th className="px-3 py-2 text-left font-bold bg-[#5a7a3a] text-white text-[11px] whitespace-nowrap">Nama</th>
              <th className="px-3 py-2 text-center font-bold bg-[#5a7a3a] text-white text-[11px] whitespace-nowrap">Jumlah</th>
              <th className="px-3 py-2 text-center font-bold bg-[#5a7a3a] text-white text-[11px] whitespace-nowrap">Persentase</th>
            </tr>
          </thead>
          <tbody>
            {stats.distribution.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 text-gray-400 text-[11px] whitespace-nowrap sticky left-0 bg-inherit">{idx + 1}.</td>
                <td className="px-3 py-2 text-gray-700 text-xs whitespace-nowrap">{item.name}</td>
                <td className="px-3 py-2 text-center font-semibold text-gray-800 text-xs whitespace-nowrap">{item.count.toLocaleString('id-ID')}</td>
                <td className="px-3 py-2 text-center text-gray-500 text-xs whitespace-nowrap">{item.percentage}%</td>
              </tr>
            ))}
            <tr className="border-t-2 border-[#6b8e3d] bg-[#f0f7e8]">
              <td className="px-3 py-2 font-bold text-[#6b8e3d] whitespace-nowrap sticky left-0 bg-[#f0f7e8]">∑</td>
              <td className="px-3 py-2 font-bold text-[#6b8e3d] whitespace-nowrap">Grand Total</td>
              <td className="px-3 py-2 text-center font-bold text-[#6b8e3d] whitespace-nowrap">{stats.totalCount.toLocaleString('id-ID')}</td>
              <td className="px-3 py-2 text-center font-bold text-[#6b8e3d] whitespace-nowrap">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function formatColumnLabel(col: string): string {
  return col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return val.toLocaleString('id-ID');
    return val.toLocaleString('id-ID', { maximumFractionDigits: 2 });
  }
  if (typeof val === 'boolean') return val ? 'Ya' : 'Tidak';
  const str = String(val);
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  if (str.length > 60) return str.substring(0, 57) + '...';
  return str;
}
