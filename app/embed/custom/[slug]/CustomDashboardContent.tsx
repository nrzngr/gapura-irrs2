'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ChartPreview } from '@/components/builder/ChartPreview';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, ChevronDown as ChevronDownIcon, X, Download, FileSpreadsheet, Presentation, ExternalLink } from 'lucide-react';
import { DynamicFilterHeader } from '@/components/builder/DynamicFilterHeader';
import { exportToXlsx, exportToPptx } from '@/lib/dashboard-export';
import type { ChartVisualization, QueryResult, QueryDefinition } from '@/types/builder';

// ─── Green Branding Palette ─────────────────────────────────────────────────
const GAPURA_GREEN = '#6b8e3d';
const GAPURA_BANNER = '#5a7a3a';
const GREEN_PALETTE = ['#7cb342', '#558b2f', '#aed581', '#33691e', '#9ccc65', '#689f38', '#c5e1a5', '#43a047', '#81c784', '#4caf50'];

// Filter fields that can be interactive
const FILTER_FIELDS = [
  { key: 'hub', label: 'HUB', table: 'reports', field: 'hub' },
  { key: 'branch', label: 'Branch', table: 'reports', field: 'branch' },
  { key: 'maskapai', label: 'Maskapai', table: 'reports', field: 'airline_type' },
  { key: 'airline', label: 'Airlines', table: 'reports', field: 'airline' },
  { key: 'main_category', label: 'Kategori', table: 'reports', field: 'main_category' },
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

type ActiveFilters = Record<string, string>;

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

  // Interactive filters
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [exportingFormat, setExportingFormat] = useState<'xlsx' | 'pptx' | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ─── HANDLERS ─────────────────────────────────────────────────────────────

  const handleViewDetail = (
    chartTitle: string, 
    data: any[], 
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

  const fetchChartData = useCallback(async (charts: ChartData[]) => {
    const dataMap = new Map<string, ChartResult>();

    // Separate query-based charts from legacy charts
    const queryCharts = charts.filter(c => c.query_config);
    const legacyCharts = charts.filter(c => !c.query_config);

    // Batch fetch query-based charts in a single request
    const batchPromise = queryCharts.length > 0
      ? (async () => {
          try {
            const batchQueries = queryCharts.map(chart => ({
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
    setChartsData(dataMap);
  }, [range, applyFiltersToQuery]);

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
      const exportPages = pages.map(p => ({
        name: p.name,
        tiles: p.tiles.map(t => ({
          id: t.id,
          title: t.title,
          chartType: t.visualization_config?.chartType || t.chart_type || 'bar',
        })),
      }));
      const payload = {
        dashboardName: dashboard.name,
        subtitle: dashboard.description || dashboard.config?.subtitle,
        pages: exportPages,
        chartsData,
      };
      if (format === 'xlsx') await exportToXlsx(payload);
      else await exportToPptx(payload);
    } catch (err) {
      console.error(`[Dashboard] Export ${format} error:`, err);
    } finally {
      setExportingFormat(null);
    }
  }, [dashboard, pages, chartsData]);

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
                <div key={i} style={{ background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ width: 120, height: 14, background: '#f0f0f0', borderRadius: 4 }} className="animate-pulse" />
                  </div>
                  <div style={{ padding: 16, height: 200 }}>
                    <div style={{ width: '100%', height: '100%', background: '#f8f8f8', borderRadius: 6 }} className="animate-pulse" />
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
      <div style={S.loadingWrap}>
        <AlertCircle size={40} style={{ color: '#ccc', marginBottom: 16 }} />
        <p style={{ color: '#666', fontWeight: 600 }}>Dashboard tidak ditemukan</p>
        <p style={{ color: '#999', fontSize: 12, marginTop: 4 }}>{slug}</p>
      </div>
    );
  }

  const hasMultiplePages = pages.length > 1;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* ── SIDEBAR (only if multi-page) ── */}
      {hasMultiplePages && (
        <div style={S.sidebarWrap(sidebarCollapsed)}>
          {/* Sidebar Header */}
          <div style={S.sidebarHeader(sidebarCollapsed)}>
            {!sidebarCollapsed && (
              <img src="/logo.png" alt="Gapura" style={{ height: 48, objectFit: 'contain' }} />
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#999', flexShrink: 0 }}
            >
              {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          {/* Page Navigation */}
          <div style={S.sidebarNav(sidebarCollapsed)}>
            {!sidebarCollapsed && (
              <div style={S.sidebarSectionLabel}>
                Halaman
              </div>
            )}
            {pages.map((page, idx) => {
              const isActive = activePage === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setActivePage(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: sidebarCollapsed ? '10px 8px' : '10px 12px',
                    marginBottom: 2,
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    background: isActive ? GAPURA_GREEN : 'transparent',
                    color: isActive ? '#fff' : '#555',
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 500,
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    borderLeft: isActive ? `3px solid #fff` : '3px solid transparent',
                  }}
                  className={!isActive ? 'embed-sidebar-btn' : undefined}
                >
                  <span style={{
                    width: 22, height: 22, borderRadius: 4,
                    background: isActive ? 'rgba(255,255,255,0.2)' : '#e8e8e8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                    color: isActive ? '#fff' : '#888',
                    transition: 'all 0.2s ease',
                  }}>
                    {idx + 1}
                  </span>
                  {!sidebarCollapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.name}</span>}
                </button>
              );
            })}
          </div>

          {/* Active Filters Summary in Sidebar */}
          {!sidebarCollapsed && activeFilterCount > 0 && (
            <div style={{ padding: '8px 16px 12px', borderTop: '1px solid #e8e8e8' }}>
              <div style={{ ...S.sidebarSectionLabel, padding: 0, marginBottom: 6 }}>
                Filter Aktif ({activeFilterCount})
              </div>
              <button
                onClick={() => { setActiveFilters({}); setDateFrom(''); setDateTo(''); }}
                style={{ fontSize: 10, color: '#e53935', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Reset Filter
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div style={S.mainContent}>
        {/* ── HEADER ── */}
        <div style={S.headerWrap}>
          <div style={S.headerInner}>
            {/* Logo + Title + Date */}
            <div style={S.titleRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {!hasMultiplePages && <img src="/logo.png" alt="Gapura Airport Services" style={{ height: 60, objectFit: 'contain' }} />}
                <div>
                  <h1 style={S.title}>
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
                    <span style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>{pages[activePage].name}</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Export dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={exportingFormat !== null}
                    style={S.exportBtn}
                  >
                    {exportingFormat ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {exportingFormat ? 'Exporting...' : 'Export'}
                    <ChevronDownIcon size={10} />
                  </button>
                  {showExportMenu && (
                    <div style={S.exportMenu}>
                      <button onClick={() => handleExport('xlsx')} style={S.exportMenuItem}>
                        <FileSpreadsheet size={14} style={{ color: '#1b7a3d' }} />
                        <span>Export ke Excel (.xlsx)</span>
                      </button>
                      <button onClick={() => handleExport('pptx')} style={S.exportMenuItem}>
                        <Presentation size={14} style={{ color: '#c43e1c' }} />
                        <span>Export ke PowerPoint (.pptx)</span>
                      </button>
                    </div>
                  )}
                </div>
                {/* Date range */}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowDatePicker(!showDatePicker)} style={S.dateBtn}>
                    {formatDateRange()}
                    <ChevronDownIcon size={12} />
                  </button>
                  {showDatePicker && (
                    <div style={S.datePicker}>
                      <label style={S.dateLabel}>From</label>
                      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={S.dateInput} />
                      <label style={S.dateLabel}>To</label>
                      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={S.dateInput} />
                      <button onClick={() => setShowDatePicker(false)} style={S.dateApply}>Apply</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Banner with Interactive Filters */}
            <div style={S.banner}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                Irregularity, Complain & Compliment Report
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <DynamicFilterHeader 
                  onFilterChange={setActiveFilters}
                  initialFilters={activeFilters}
                  variant="white"
                />
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(''); setDateTo(''); }}
                    style={{ ...S.filterPill, background: 'rgba(229,57,53,0.3)', borderColor: 'rgba(229,57,53,0.5)' }}
                  >
                    <X size={10} /> Reset Date
                  </button>
                )}
              </div>
            </div>

            {/* KPI Stats Row */}
            {kpiTiles.length > 0 && (
              <div style={{ ...S.statsRow, gridTemplateColumns: `repeat(${Math.min(kpiTiles.length, 5)}, 1fr)` }}>
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
                    <div key={tile.id} style={{ textAlign: 'center' }}>
                      <div style={S.statLabel}>{tile.title}</div>
                      <div style={S.statValue}>{typeof value === 'number' ? value.toLocaleString('id-ID') : value}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {kpiTiles.length === 0 && (
              <div style={{ ...S.statsRow, gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={S.statLabel}>Total Report</div>
                  <div style={S.statValue}>{totalReport > 0 ? totalReport.toLocaleString('id-ID') : '-'}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={S.statLabel}>Halaman</div>
                  <div style={S.statValue}>{pages.length}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={S.statLabel}>Total Chart</div>
                  <div style={S.statValue}>{dashboard.dashboard_charts.length}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={S.statLabel}>Filter Aktif</div>
                  <div style={S.statValue}>{activeFilterCount || '-'}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CONTENT: Chart + Detail Table Groups ── */}
        <div style={S.contentWrap}>
          <div style={S.chartGrid}>
            {contentTiles.map(chart => {
              const cr = chartsData.get(chart.id);
              if (!cr) return null;
              let layout = chart.layout || { w: 6, h: 2 };

              // --- "GENIUS FIX" OVERRIDE ---
              // Correctly access title from visualization object
              const title = (chart as any).visualization?.title;
              
              if (title === 'Case Report by Area') layout = { ...layout, w: 8 };
              if (title === 'General Category') layout = { ...layout, w: 4 }; // Force order to stick next to Heatmap
              if (title === 'Terminal Area Category') layout = { ...layout, w: 6 };
              if (title === 'Apron Area Category') layout = { ...layout, w: 6 };
              
              // Apply explicit order via CSS `order` property
              const orderStyle = title === 'Case Report by Area' ? 1 
                               : title === 'General Category' ? 2 
                               : title === 'Terminal Area Category' ? 3 
                               : title === 'Apron Area Category' ? 4 
                               : 10;
              
              const colSpan = layout.w || 6;
              const isTableType = chart.visualization_config?.chartType === 'table';

              // Apply explicit order via flex/grid order if needed, but here reliable DOM order is better.
              // Since sorting the array directly might cause re-renders if not stable, we rely on layout config.
              // Actually, to fix strict ordering visually (Row 1: Heatmap+General), we use 'order' CSS property if the container is flex/grid.
              // But standard CSS Grid auto-placement follows DOM order.
              // Let's rely on width for now, assuming typical DB order: Heatmap -> Terminal -> Apron -> General.
              
              // If the DB order is H -> T -> A -> G:
              // H(8) [Row 1]
              // T(6) -> Row 2
              // A(6) -> Row 2
              // G(4) -> Row 3? No, G(4) might fill the empty space in Row 1 if dense packing is on?
              // The container likely uses `grid-auto-flow: dense`? If not, G(4) stays in Row 3.
              
              // We NEED to reorder the tiles in the map function? impossible inside map.
              // We should sort contentTiles BEFORE mapping.
              // BUT I can't easily change the hook logic above.
              
              // ALTERNATIVE: Use `order` style property! CSS Grid items respect `order`.
              return (
                <div key={chart.id} style={{ 
                  gridColumn: `span ${colSpan}`, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 2,
                  order: orderStyle // Force visual order
                }}>
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
                    <div style={{ ...S.card, borderRadius: '8px 8px 0 0' }}>
                      <div style={S.cardTitle}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#333' }}>{chart.title}</h3>
                        <span style={{ fontSize: 11, color: '#999' }}>{cr.queryResult.rowCount} baris</span>
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
          <div style={{
            padding: '0 24px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <button
              onClick={() => setActivePage(p => Math.max(0, p - 1))}
              disabled={activePage === 0}
              style={{ ...S.navBtn, opacity: activePage === 0 ? 0.4 : 1 }}
            >
              <ChevronLeft size={16} /> Sebelumnya
            </button>
            <span style={{ fontSize: 12, color: '#888', padding: '0 12px' }}>
              Halaman {activePage + 1} / {pages.length}
            </span>
            <button
              onClick={() => setActivePage(p => Math.min(pages.length - 1, p + 1))}
              disabled={activePage >= pages.length - 1}
              style={{ ...S.navBtn, opacity: activePage >= pages.length - 1 ? 0.4 : 1 }}
            >
              Selanjutnya <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={S.footer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="Gapura" style={{ height: 24, objectFit: 'contain', opacity: 0.7 }} />
            <span style={{ color: '#666', fontWeight: 500, letterSpacing: 0.3 }}>Gapura IRRS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#888' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#43a047', display: 'inline-block', boxShadow: '0 0 4px rgba(67,160,71,0.5)' }} />
              Data otomatis diperbarui
            </span>
            <span style={{ color: '#bbb' }}>|</span>
            <span style={{ color: '#aaa' }}>&copy; {new Date().getFullYear()} PT Gapura Angkasa</span>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {showExportMenu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 29 }}
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
    chartType: (chart.chart_type as any) || 'bar',
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
    <div style={S.card}>
      <div style={{...S.cardTitle, justifyContent: 'space-between'}}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#333' }}>{chart.title}</h3>
        <button
          onClick={handleViewDetail}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#fff',
            backgroundColor: '#6b8e3d',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
          title="Lihat Detail"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>Detail</span>
        </button>
      </div>
      <div style={{ padding: '12px 16px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: '100%', flex: 1, minHeight: 400 }}>
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
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {urls.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#1565c0', textDecoration: 'underline', fontSize: 11 }}>
          Evidence {urls.length > 1 ? i + 1 : ''}
        </a>
      ))}
    </span>
  );
}

// ─── LEGACY CHART CARD ──────────────────────────────────────────────────────

function LegacyCard({ chart, stats }: { chart: ChartData; stats: ChartResult['stats'] & {} }) {
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#333' }}>{chart.title}</h3>
        <span style={{ fontSize: 11, color: '#999' }}>{stats.totalCount} total</span>
      </div>
      <div style={{ padding: '8px 16px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {stats.distribution.slice(0, 10).map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#999', width: 20, textAlign: 'right', flexShrink: 0 }}>{idx + 1}.</span>
              <span style={{ fontSize: 12, color: '#333', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#333', flexShrink: 0 }}>{item.count}</span>
              <div style={{ width: 80, height: 14, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ width: `${item.percentage}%`, height: '100%', background: GAPURA_GREEN, borderRadius: 2 }} />
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
    <div style={S.detailCard}>
      <div style={S.detailHeader}>
        <span style={S.detailTitle}>Detail: {title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: '#999' }}>{rows.length} baris</span>
          {onViewDetail && (
            <button
              onClick={onViewDetail}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 10,
                color: '#666'
              }}
              title="View Full Detail"
            >
              <ExternalLink size={12} />
              Detail
            </button>
          )}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>#</th>
              {result.columns.map(col => (
                <th key={col} onClick={() => handleSort(col)} style={{ ...S.th, cursor: 'pointer', userSelect: 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {formatColumnLabel(col)}
                    {sortCol === col && <span style={{ fontSize: 9 }}>{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ ...S.td, color: '#999', fontSize: 11 }}>{page * PAGE_SIZE + idx + 1}.</td>
                {result.columns.map(col => {
                  const val = row[col];
                  const isEvidenceCol = col.toLowerCase().includes('evidence') || col.toLowerCase().includes('link');
                  if (isEvidenceCol) {
                    return <td key={col} style={{ ...S.td }}>{renderEvidenceCell(val)}</td>;
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
                    <td key={col} style={{ ...S.td, background: cellBg, textAlign: isNum ? 'center' : 'left', fontWeight: isNum ? 600 : 400 }}>
                      {formatCellValue(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Grand Total Row */}
            {hasNumericTotal && (
              <tr style={{ borderTop: '2px solid ' + GAPURA_GREEN, background: '#f0f7e8' }}>
                <td style={{ ...S.td, fontWeight: 700, color: GAPURA_GREEN }}>∑</td>
                {result.columns.map(col => (
                  <td key={col} style={{
                    ...S.td,
                    fontWeight: 700,
                    color: GAPURA_GREEN,
                    textAlign: grandTotal[col] !== undefined ? 'center' : 'left',
                  }}>
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
        <div style={S.pagination}>
          <span>{page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, rows.length)} / {rows.length}</span>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={S.pageBtn(page === 0)}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={S.pageBtn(page >= totalPages - 1)}>
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
    <div style={S.detailCard}>
      <div style={S.detailHeader}>
        <span style={S.detailTitle}>Detail: {title}</span>
        <span style={{ fontSize: 11, color: '#999' }}>{stats.totalCount} total</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>#</th>
              <th style={S.th}>Nama</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Jumlah</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Persentase</th>
            </tr>
          </thead>
          <tbody>
            {stats.distribution.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ ...S.td, color: '#999', fontSize: 11 }}>{idx + 1}.</td>
                <td style={S.td}>{item.name}</td>
                <td style={{ ...S.td, textAlign: 'center', fontWeight: 600 }}>{item.count.toLocaleString('id-ID')}</td>
                <td style={{ ...S.td, textAlign: 'center', color: '#666' }}>{item.percentage}%</td>
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid ' + GAPURA_GREEN, background: '#f0f7e8' }}>
              <td style={{ ...S.td, fontWeight: 700, color: GAPURA_GREEN }}>∑</td>
              <td style={{ ...S.td, fontWeight: 700, color: GAPURA_GREEN }}>Grand Total</td>
              <td style={{ ...S.td, textAlign: 'center', fontWeight: 700, color: GAPURA_GREEN }}>{stats.totalCount.toLocaleString('id-ID')}</td>
              <td style={{ ...S.td, textAlign: 'center', fontWeight: 700, color: GAPURA_GREEN }}>100%</td>
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

// ─── INLINE STYLES ──────────────────────────────────────────────────────────

const S = {
  sidebarWrap: (collapsed: boolean) => ({
    width: collapsed ? 48 : 240,
    background: '#fff',
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.2s ease',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto',
    zIndex: 20,
  }) as React.CSSProperties,

  sidebarHeader: (collapsed: boolean) => ({
    padding: collapsed ? '12px 8px' : '16px 12px',
    borderBottom: '1px solid #e8e8e8',
    display: 'flex',
    flexDirection: collapsed ? 'row' : 'column',
    alignItems: 'center',
    gap: 8,
  }) as React.CSSProperties,

  sidebarNav: (collapsed: boolean) => ({
    padding: collapsed ? '8px 4px' : '8px',
    flex: 1,
  }) as React.CSSProperties,

  sidebarSectionLabel: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#999',
    padding: '8px 8px 4px',
    marginBottom: 2,
  } as React.CSSProperties,

  loadingWrap: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f5',
  } as React.CSSProperties,

  mainContent: {
    flex: 1,
    minWidth: 0,
    background: '#f5f5f5',
  } as React.CSSProperties,

  headerWrap: {
    background: '#fff',
    borderBottom: '1px solid #e0e0e0',
  } as React.CSSProperties,

  headerInner: {
    padding: '16px 24px',
  } as React.CSSProperties,

  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  } as React.CSSProperties,

  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#333',
    margin: 0,
    lineHeight: 1.2,
  } as React.CSSProperties,

  dateBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    borderRadius: 6,
    background: GAPURA_GREEN,
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  } as React.CSSProperties,

  datePicker: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    padding: 16,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 50,
    minWidth: 280,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  } as React.CSSProperties,

  dateLabel: { fontSize: 11, fontWeight: 600, color: '#666' } as React.CSSProperties,
  dateInput: { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 } as React.CSSProperties,
  dateApply: {
    marginTop: 4, padding: '6px 12px', background: GAPURA_GREEN,
    color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600,
  } as React.CSSProperties,

  banner: {
    background: GAPURA_BANNER,
    borderRadius: 6,
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  } as React.CSSProperties,

  filterPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,

  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    zIndex: 30,
    minWidth: 160,
    maxHeight: 240,
    overflowY: 'auto',
    padding: 4,
  } as React.CSSProperties,

  dropdownItem: (active: boolean) => ({
    display: 'block',
    width: '100%',
    padding: '7px 10px',
    border: 'none',
    background: active ? '#f0f7e8' : 'transparent',
    color: active ? GAPURA_GREEN : '#333',
    fontSize: 12,
    fontWeight: active ? 700 : 400,
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: 3,
    whiteSpace: 'nowrap',
  }) as React.CSSProperties,

  statsRow: {
    display: 'grid',
    gap: 16,
    marginTop: 16,
  } as React.CSSProperties,

  statLabel: { fontSize: 12, fontWeight: 600, color: GAPURA_GREEN } as React.CSSProperties,
  statValue: { fontSize: 32, fontWeight: 700, color: GAPURA_GREEN } as React.CSSProperties,

  contentWrap: {
    padding: '20px 24px 24px',
  } as React.CSSProperties,

  chartGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: 20,
    alignItems: 'stretch',
  } as React.CSSProperties,

  card: {
    background: '#fff',
    borderRadius: '10px 10px 0 0',
    border: '1px solid #e0e0e0',
    borderBottom: 'none',
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,

  cardTitle: {
    padding: '14px 18px 10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,

  detailCard: {
    background: '#fff',
    borderRadius: '0 0 10px 10px',
    border: '1px solid #e0e0e0',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  } as React.CSSProperties,

  detailHeader: {
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: `2px solid ${GAPURA_GREEN}`,
    background: '#fafafa',
  } as React.CSSProperties,

  detailTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: GAPURA_GREEN,
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  } as React.CSSProperties,

  th: {
    padding: '8px 12px',
    textAlign: 'left',
    fontWeight: 700,
    background: GAPURA_BANNER,
    color: '#fff',
    fontSize: 11,
    whiteSpace: 'nowrap',
  } as React.CSSProperties,

  td: {
    padding: '7px 12px',
    color: '#333',
    fontSize: 12,
    whiteSpace: 'nowrap',
  } as React.CSSProperties,

  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '8px 16px',
    gap: 8,
    fontSize: 12,
    color: '#666',
    borderTop: '1px solid #f0f0f0',
  } as React.CSSProperties,

  pageBtn: (disabled: boolean) => ({
    background: 'none',
    border: 'none',
    cursor: disabled ? 'default' : 'pointer',
    padding: 2,
    color: disabled ? '#ddd' : '#666',
  }) as React.CSSProperties,

  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 16px',
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    background: '#fff',
    color: '#555',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,

  footer: {
    position: 'sticky',
    bottom: 0,
    zIndex: 10,
    background: '#ffffff',
    borderTop: '1px solid #e0e0e0',
    padding: '10px 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 11,
    color: '#999',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
  } as React.CSSProperties,

  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 6,
    background: '#fff',
    color: '#555',
    border: '1px solid #d0d0d0',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  } as React.CSSProperties,

  exportMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
    zIndex: 50,
    minWidth: 220,
    padding: 4,
    overflow: 'hidden',
  } as React.CSSProperties,

  exportMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 14px',
    border: 'none',
    background: 'transparent',
    color: '#333',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    borderRadius: 6,
    transition: 'background 0.15s ease',
    textAlign: 'left',
  } as React.CSSProperties,
};
