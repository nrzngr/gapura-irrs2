import type { DashboardDefinition, DashboardTile, DashboardPage, QueryFilter } from '@/types/builder';

// ─── Division Filters ────────────────────────────────────────────────────────
// Division filters removed as per requirement

function dateFilters(dateFrom: string, dateTo: string) {
  // Fix: Ensure dateTo includes the entire day if time is not specified
  // This prevents exclusion of records on the end date when using ISO timestamps
  let safeDateTo = dateTo;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    safeDateTo = `${dateTo}T23:59:59`;
  }

  return [
    { table: 'reports', field: 'date_of_event', operator: 'gte' as const, value: dateFrom, conjunction: 'AND' as const },
    { table: 'reports', field: 'date_of_event', operator: 'lte' as const, value: safeDateTo, conjunction: 'AND' as const },
  ];
}

let tileCounter = 0;
function tileId() { return `cft-${Date.now()}-${++tileCounter}`; }

export function generateCustomerFeedbackDashboard(dateFrom: string, dateTo: string): DashboardDefinition {
  tileCounter = 0;
  
  // Parse dates safely - handle ISO format (YYYY-MM-DD)
  const parseDate = (dateStr: string): Date => {
    // If already in YYYY-MM-DD format, parse directly to avoid timezone issues
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed
    }
    return new Date(dateStr);
  };
  
  const df = dateFilters(dateFrom, dateTo);
  
  // Filter for NON CARGO pages (1, 2, 3)
  const nonCargoFilter: QueryFilter = {
    table: 'reports',
    field: 'source_sheet',
    operator: 'eq' as const,
    value: 'NON CARGO',
    conjunction: 'AND' as const
  };
  const baseFilters = [...df, nonCargoFilter];

  const fromDate = parseDate(dateFrom);
  const toDate = parseDate(dateTo);
  const fromYear = fromDate.getFullYear();
  const toYear = toDate.getFullYear();
  
  // Check if using full date range (1900-2099), if so don't show year range in title
  const isFullRange = fromYear === 1900 && toYear === 2099;
  const yearRange = fromYear === toYear ? `${fromYear}` : `${fromYear} - ${toYear}`;
  const displayTitle = isFullRange ? 'Customer Feedback' : `Landside & Airside Customer Feedback ${yearRange}`;
  const displayDescription = isFullRange 
    ? 'Landside & Airside Customer Feedback – Irregularity, Complaint & Compliment Report'
    : `Landside & Airside Customer Feedback ${yearRange} – Irregularity, Complaint & Compliment Report`;
  
  console.log('[Customer Feedback] Date range:', { dateFrom, dateTo, fromYear, toYear, yearRange });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1: Case Category (Landside/Airside)
  // ═══════════════════════════════════════════════════════════════════════════
  const page1Tiles: DashboardTile[] = [
    // ── KPI Row ──
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'total' }],
        filters: [...baseFilters], sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Report', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 0, y: 0, w: 3, h: 1 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'branch', function: 'COUNT_DISTINCT', alias: 'total' }],
        filters: [...baseFilters], sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Branch', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 3, y: 0, w: 3, h: 1 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'airline', function: 'COUNT_DISTINCT', alias: 'total' }],
        filters: [...baseFilters], sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Airlines', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 6, y: 0, w: 3, h: 1 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'total' }],
        filters: [...baseFilters, { table: 'reports', field: 'main_category', operator: 'eq' as const, value: 'Compliment', conjunction: 'AND' as const }],
        sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Compliment Report', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 9, y: 0, w: 3, h: 1 },
    },

    // ── Row 1: 4 charts (Stacked 2x2) ──
    // Donut: Report by Case Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'category', alias: 'category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...baseFilters],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'donut', title: 'Report by Case Category', xAxis: 'category', yAxis: ['count'], showLegend: true, showLabels: true },
      layout: { x: 0, y: 1, w: 6, h: 2 },
    },
    // Horizontal Bar: Branch Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'branch', alias: 'branch' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...baseFilters],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Branch Report', xAxis: 'branch', yAxis: ['count'], showLegend: false, showLabels: true },
      layout: { x: 6, y: 1, w: 6, h: 2 },
    },
    // Horizontal Bar: Airlines Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'airlines', alias: 'airline' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...baseFilters],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Airlines Report', xAxis: 'airline', yAxis: ['count'], showLegend: false, showLabels: true },
      layout: { x: 0, y: 3, w: 6, h: 2 },
    },
    // Horizontal Bar: Monthly Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'date_of_event', alias: 'month', dateGranularity: 'month' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...baseFilters],
        sorts: [{ field: 'month', direction: 'desc' }], limit: 12,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Monthly Report', xAxis: 'month', yAxis: ['count'], showLegend: false, showLabels: true },
      layout: { x: 6, y: 3, w: 6, h: 2 },
    },

    // ── Row 2: Donut + 2 Heatmaps (Stacked) ──
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'area', alias: 'area' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...baseFilters],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 5,
      },
      visualization: { chartType: 'donut', title: 'Category by Area', xAxis: 'area', yAxis: ['count'], showLegend: true, showLabels: true },
      layout: { x: 0, y: 5, w: 6, h: 2 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'branch', alias: 'Branch' },
          { table: 'reports', field: 'category', alias: 'Report Category' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Record Count' }],
        filters: [...baseFilters],
        sorts: [{ field: 'Record Count', direction: 'desc' }], limit: 200,
      },
      visualization: { 
        chartType: 'pivot', 
        title: 'Case Category by Branch', 
        xAxis: 'Report Category', 
        yAxis: ['Branch'], 
        showLegend: false, 
        showLabels: true 
      },
      layout: { x: 6, y: 5, w: 6, h: 2 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'airlines', alias: 'airline' },
          { table: 'reports', field: 'category', alias: 'category' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...baseFilters],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 200,
      },
      visualization: { chartType: 'table', title: 'Case Category by Airlines', yAxis: [], showLegend: false, showLabels: false },
      layout: { x: 0, y: 7, w: 12, h: 2 },
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2: Detail Category (Landside/Airside)
  // ═══════════════════════════════════════════════════════════════════════════
  const page2KPIs = page1Tiles.slice(0, 4).map(t => ({ ...t, id: tileId() }));

  const page2Tiles: DashboardTile[] = [
    ...page2KPIs,
    // Pivot Table: Case Report by Area (Branch + Airlines as rows, Area as columns)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'branch', alias: 'Branch Report' },
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'area', alias: 'Area' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters],
        sorts: [{ field: 'Branch Report', direction: 'asc' }, { field: 'Total', direction: 'desc' }], 
        limit: 500,
      },
      visualization: { 
        chartType: 'pivot', 
        title: 'Case Report by Area',
        xAxis: 'Area',
        yAxis: ['Branch Report', 'Airlines'],
        showLegend: false, 
        showLabels: true 
      },
      layout: { x: 0, y: 1, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2 (Standardized)
    },
    // Table -> Bar: Terminal Area Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'terminal_area_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'terminal_area_category', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 100,
      },
      visualization: { 
        chartType: 'horizontal_bar', 
        title: 'Terminal Area Category', 
        xAxis: 'Category', 
        yAxis: ['Total'], 
        showLegend: false, 
        showLabels: true, 
        colors: ['#10b981'],
        crossFiltering: true,
        openLinkInNewTab: true
      },
      layout: { x: 6, y: 1, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2 (Standardized)
    },
    // Table -> Bar: Apron Area Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'apron_area_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'apron_area_category', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 100,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Apron Area Category', xAxis: 'Category', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#10b981'] },
      layout: { x: 0, y: 3, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2 (Standardized)
    },
    // Table -> Bar: General Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'general_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'general_category', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 100,
      },
      visualization: { chartType: 'horizontal_bar', title: 'General Category', xAxis: 'Category', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#10b981'] },
      layout: { x: 6, y: 3, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2 (Standardized)
    },
    // Horizontal Bar: HUB Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'hub', alias: 'hub' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...baseFilters],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'horizontal_bar', title: 'HUB Report', xAxis: 'hub', yAxis: ['count'], showLegend: false, showLabels: true, colors: ['#81c784'] },
      layout: { x: 0, y: 5, w: 6, h: 2 },
    },
    // Table: Detail Report Landside & Airside
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'date_of_event', alias: 'Date' },
          { table: 'reports', field: 'main_category', alias: 'Category' },
          { table: 'reports', field: 'branch', alias: 'Branch' },
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'flight_number', alias: 'Flight' },
          { table: 'reports', field: 'description', alias: 'Report' }, // Updated to 'description'
          { table: 'reports', field: 'root_caused', alias: 'Root Caused' }, // Updated to 'root_caused'
          { table: 'reports', field: 'action_taken', alias: 'Action Taken' },
          { table: 'reports', field: 'evidence_url', alias: 'Evidence Link' },
        ],
        measures: [],
        filters: [...baseFilters],
        sorts: [{ field: 'Date', direction: 'desc' }], limit: 5000,
      },
      visualization: { chartType: 'table', title: 'Report Landside & Airside', yAxis: [], showLegend: false, showLabels: false },
      layout: { x: 0, y: 7, w: 12, h: 4 }, // WIDTH 12, HEIGHT 4 (Table Exception)
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3: Detail Report (6 pivot tables)
  // ═══════════════════════════════════════════════════════════════════════════
  const page3KPIs = page1Tiles.slice(0, 4).map(t => ({ ...t, id: tileId() }));
  const page3Tiles: DashboardTile[] = [
    ...page3KPIs,
    
    // Row 1: By Branch
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'terminal_area_category', alias: 'Terminal Category' },
          { table: 'reports', field: 'branch', alias: 'Branch' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'terminal_area_category', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], 
        limit: 100,
      },
      visualization: { 
        chartType: 'pivot', 
        title: 'Terminal Area by Branch',
        xAxis: 'Terminal Category',
        yAxis: ['Branch'],
        showLegend: false,
        showLabels: true 
      },
      layout: { x: 0, y: 1, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'apron_area_category', alias: 'Apron Category' },
          { table: 'reports', field: 'branch', alias: 'Branch' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'apron_area_category', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], 
        limit: 100,
      },
      visualization: { 
        chartType: 'pivot', 
        title: 'Apron Area by Branch',
        xAxis: 'Apron Category',
        yAxis: ['Branch'],
        showLegend: false,
        showLabels: true 
      },
      layout: { x: 6, y: 1, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'general_category', alias: 'General Category' },
          { table: 'reports', field: 'branch', alias: 'Branch' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'general_category', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], 
        limit: 100,
      },
      visualization: { 
        chartType: 'pivot', 
        title: 'General Category by Branch',
        xAxis: 'General Category',
        yAxis: ['Branch'],
        showLegend: false,
        showLabels: true 
      },
      layout: { x: 0, y: 3, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2, Row 2
    },
    
    // Row 2: By Airlines
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'terminal_area_category', alias: 'Terminal Category' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'terminal_area_category', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], 
        limit: 100,
      },
      visualization: { 
        chartType: 'pivot', 
        title: 'Terminal Area by Airlines',
        xAxis: 'Terminal Category',
        yAxis: ['Airlines'],
        showLegend: false,
        showLabels: true 
      },
      layout: { x: 6, y: 3, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2, Row 2
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'apron_area_category', alias: 'Apron Category' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'apron_area_category', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], 
        limit: 100,
      },
      visualization: { 
        chartType: 'pivot', 
        title: 'Apron Area by Airlines',
        xAxis: 'Apron Category',
        yAxis: ['Airlines'],
        showLegend: false,
        showLabels: true 
      },
      layout: { x: 0, y: 5, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2, Row 3
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'general_category', alias: 'General Category' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...baseFilters, { table: 'reports', field: 'general_category', operator: 'is_not_null' as const, value: '', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], 
        limit: 100,
      },
      visualization: { 
        chartType: 'pivot', 
        title: 'General Category by Airlines',
        xAxis: 'General Category',
        yAxis: ['Airlines'],
        showLegend: false,
        showLabels: true 
      },
      layout: { x: 6, y: 5, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2, Row 3
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4: CGO Overview (Replicated from Screenshot)
  // ═══════════════════════════════════════════════════════════════════════════
  // CGO Filter using keywords instead of 'area' column
  const cgoFilter: QueryFilter = { 
    table: 'reports', 
    field: 'source_sheet', 
    operator: 'eq', 
    value: 'CGO', 
    conjunction: 'AND' 
  };
  
  const page4Tiles: DashboardTile[] = [
    // ── Row 1: 4 Horizontal Bar Charts ──
    
    // 1. Report by Case Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'main_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, cgoFilter],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Report by Case Category', xAxis: 'Category', yAxis: ['Total'], showLegend: true, showLabels: true, colors: ['#00acc1', '#81c784', '#ffd54f'] },
      layout: { x: 0, y: 0, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2
    },
    // 2. Branch Reporting
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'branch', alias: 'Branch' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, cgoFilter],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Branch Reporting', xAxis: 'Branch', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#81c784'] },
      layout: { x: 6, y: 0, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2
    },
    // 3. Airlines Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'airline', alias: 'Airline' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, cgoFilter],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Airlines Report', xAxis: 'Airline', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#81c784'] },
      layout: { x: 0, y: 2, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2, Row 2
    },
    // 4. Monthly Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'date_of_event', alias: 'Month', dateGranularity: 'month' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, cgoFilter],
        sorts: [{ field: 'Month', direction: 'desc' }], limit: 12,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Monthly Report', xAxis: 'Month', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#81c784'] },
      layout: { x: 6, y: 2, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2, Row 2
    },

    // ── Row 2: Category by Area + 2 Pivot Tables ──

    // 5. Category by Area (Horizontal Bar)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'area', alias: 'Area' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, cgoFilter],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 5,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Category by Area', xAxis: 'Area', yAxis: ['Total'], showLegend: true, showLabels: true, colors: ['#00acc1', '#81c784', '#ffd54f'] },
      layout: { x: 0, y: 4, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2, Row 3
    },
    // 6. Case Category by Branch (Pivot)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'branch', alias: 'Reporting Branch' },
          { table: 'reports', field: 'main_category', alias: 'Report Category' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Grand total' }],
        filters: [...df, cgoFilter],
        sorts: [{ field: 'Grand total', direction: 'desc' }], limit: 100,
      },
      visualization: { 
        chartType: 'pivot', 
        title: 'Case Category by Branch', 
        xAxis: 'Report Category', 
        yAxis: ['Reporting Branch'], 
        showLegend: false, 
        showLabels: true 
      },
      layout: { x: 6, y: 4, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2, Row 3
    },
    // 7. Case Category by Airlines (Pivot)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'main_category', alias: 'Report Category' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Grand total' }],
        filters: [...df, cgoFilter],
        sorts: [{ field: 'Grand total', direction: 'desc' }], limit: 100,
      },
      visualization: { chartType: 'table', title: 'Case Category by Airlines', yAxis: [], showLegend: false, showLabels: false },
      layout: { x: 0, y: 6, w: 12, h: 2 }, // WIDTH 12, HEIGHT 2, Row 4
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 5: CGO Detail (Replicated from Screenshot)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const page5Tiles: DashboardTile[] = [
    // ── Row 1: Pivot + 3 Category Bars ──

    // 1. Case Report by Area (Pivot)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'branch', alias: 'Branch Report' },
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'area', alias: 'Area' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Grand total' }],
        filters: [...df, cgoFilter],
        sorts: [{ field: 'Branch Report', direction: 'asc' }, { field: 'Grand total', direction: 'desc' }], 
        limit: 500,
      },
      visualization: { 
        chartType: 'pivot', 
        title: 'Case Report by Area',
        xAxis: 'Area',
        yAxis: ['Branch Report', 'Airlines'],
        showLegend: false, 
        showLabels: true 
      },
      layout: { x: 0, y: 0, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2
    },
    // 2. Terminal Area Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'terminal_area_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, cgoFilter, { table: 'reports', field: 'area', operator: 'eq' as const, value: 'Terminal Area', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Terminal Area Category', xAxis: 'Category', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#66bb6a'] },
      layout: { x: 6, y: 0, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2
    },
    // 3. Apron Area Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'apron_area_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, cgoFilter, { table: 'reports', field: 'area', operator: 'eq' as const, value: 'Apron Area', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Apron Area Category', xAxis: 'Category', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#66bb6a'] },
      layout: { x: 0, y: 2, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2, Row 2
    },
    // 4. General Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'general_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, cgoFilter, { table: 'reports', field: 'area', operator: 'eq' as const, value: 'General', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'horizontal_bar', title: 'General Category', xAxis: 'Category', yAxis: ['Total'], showLegend: false, showLabels: true, colors: ['#66bb6a'] },
      layout: { x: 6, y: 2, w: 6, h: 2 }, // WIDTH 6, HEIGHT 2, Row 2
    },

    // ── Row 2: HUB Report + Detail Table ──

    // 5. HUB Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'hub', alias: 'hub' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...df, cgoFilter],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'horizontal_bar', title: 'HUB Report', xAxis: 'hub', yAxis: ['count'], showLegend: false, showLabels: true, colors: ['#81c784'] },
      layout: { x: 0, y: 4, w: 6, h: 2 },
    },
    // 6. Detail Report Landside & Airside
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'date_of_event', alias: 'Date' },
          { table: 'reports', field: 'main_category', alias: 'Category' },
          { table: 'reports', field: 'branch', alias: 'Branch Report' },
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'flight_number', alias: 'Flight' },
          { table: 'reports', field: 'description', alias: 'Report' }, // Updated
          { table: 'reports', field: 'root_caused', alias: 'Root Caused' }, // Updated
          { table: 'reports', field: 'action_taken', alias: 'Action Taken' },
          { table: 'reports', field: 'evidence_url', alias: 'Evidence Link' },
        ],
        measures: [],
        filters: [...df, cgoFilter],
        sorts: [{ field: 'Date', direction: 'desc' }], limit: 5000,
      },
      visualization: { chartType: 'table', title: 'Detail Report Landside & Airside', yAxis: [], showLegend: false, showLabels: false },
      layout: { x: 0, y: 6, w: 12, h: 4 }, // WIDTH 12, HEIGHT 4 (Table Exception)
    },
  ];

  const pages: DashboardPage[] = [
    { name: 'Case Category', tiles: page1Tiles },
    { name: 'Detail Category', tiles: page2Tiles },
    { name: 'Detail Report', tiles: page3Tiles },
    { name: 'CGO Overview', tiles: page4Tiles },
    { name: 'CGO Detail', tiles: page5Tiles },
  ];

  const allTiles = pages.flatMap(p => p.tiles);

  return {
    name: displayTitle,
    description: displayDescription,
    tiles: allTiles,
    pages,
    globalFilters: [],
    refreshInterval: 300,
  };
}
