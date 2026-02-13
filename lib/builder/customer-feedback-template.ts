import type { DashboardDefinition, DashboardTile, DashboardPage } from '@/types/builder';

// ─── Division Filters ────────────────────────────────────────────────────────
// Use a sentinel string to identify the division filter for CGO page cloning
const DIVISION_SENTINEL = '__DIVISION_FILTER__';

function landsideFilter() {
  return { table: 'reports', field: 'target_division', operator: 'not_in' as const, value: ['UQ'], conjunction: 'AND' as const, _tag: DIVISION_SENTINEL };
}

function cgoFilter() {
  return { table: 'reports', field: 'target_division', operator: 'eq' as const, value: 'UQ', conjunction: 'AND' as const };
}

function dateFilters(dateFrom: string, dateTo: string) {
  return [
    { table: 'reports', field: 'created_at', operator: 'gte' as const, value: dateFrom, conjunction: 'AND' as const },
    { table: 'reports', field: 'created_at', operator: 'lte' as const, value: dateTo, conjunction: 'AND' as const },
  ];
}

let tileCounter = 0;
function tileId() { return `cft-${Date.now()}-${++tileCounter}`; }

/** Clone tiles for CGO pages: swap landside filter → CGO filter, rename titles */
function cloneForCGO(tiles: DashboardTile[]): DashboardTile[] {
  return tiles.map(t => ({
    ...t,
    id: tileId(),
    query: {
      ...t.query,
      filters: t.query.filters.map((f: any) =>
        f._tag === DIVISION_SENTINEL ? cgoFilter() : { ...f }
      ),
    },
    visualization: {
      ...t.visualization,
      title: t.visualization.title?.replace('Landside & Airside', 'CGO Cargo') || t.visualization.title,
    },
  }));
}

export function generateCustomerFeedbackDashboard(dateFrom: string, dateTo: string): DashboardDefinition {
  tileCounter = 0;
  const df = dateFilters(dateFrom, dateTo);
  const ls = landsideFilter();
  const fromYear = new Date(dateFrom).getFullYear();
  const toYear = new Date(dateTo).getFullYear();
  const yearRange = fromYear === toYear ? `${fromYear}` : `${fromYear} - ${toYear}`;

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
        filters: [...df, ls], sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Report', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 0, y: 0, w: 3, h: 1 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'branch', function: 'COUNT_DISTINCT', alias: 'total' }],
        filters: [...df, ls], sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Branch', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 3, y: 0, w: 3, h: 1 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'airline', function: 'COUNT_DISTINCT', alias: 'total' }],
        filters: [...df, ls], sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Airlines', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 6, y: 0, w: 3, h: 1 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [], dimensions: [],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'total' }],
        filters: [...df, ls, { table: 'reports', field: 'main_category', operator: 'eq' as const, value: 'Compliment', conjunction: 'AND' as const }],
        sorts: [], limit: 1,
      },
      visualization: { chartType: 'kpi', title: 'Compliment Report', yAxis: ['total'], showLegend: false, showLabels: false },
      layout: { x: 9, y: 0, w: 3, h: 1 },
    },

    // ── Row 1: 4 charts ──
    // Donut: Report by Case Category
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'main_category', alias: 'category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...df, ls],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'donut', title: 'Report by Case Category', xAxis: 'category', yAxis: ['count'], showLegend: true, showLabels: true },
      layout: { x: 0, y: 1, w: 3, h: 2 },
    },
    // Horizontal Bar: Branch Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'branch', alias: 'branch' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...df, ls],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 10, // Reduced to 10 to fit in view
      },
      visualization: { chartType: 'horizontal_bar', title: 'Branch Report', xAxis: 'branch', yAxis: ['count'], showLegend: false, showLabels: true },
      layout: { x: 3, y: 1, w: 3, h: 2 },
    },
    // Horizontal Bar: Airlines Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'airline', alias: 'airline' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...df, ls],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 10, // Reduced to 10
      },
      visualization: { chartType: 'horizontal_bar', title: 'Airlines Report', xAxis: 'airline', yAxis: ['count'], showLegend: false, showLabels: true },
      layout: { x: 6, y: 1, w: 3, h: 2 },
    },
    // Horizontal Bar: Monthly Report
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'created_at', alias: 'month', dateGranularity: 'month' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...df, ls],
        sorts: [{ field: 'month', direction: 'asc' }], limit: 12, // Reduced to 12 (1 year)
      },
      visualization: { chartType: 'horizontal_bar', title: 'Monthly Report', xAxis: 'month', yAxis: ['count'], showLegend: false, showLabels: true },
      layout: { x: 9, y: 1, w: 3, h: 2 },
    },

    // ── Row 2: Donut + 2 Heatmaps (Even 4-4-4 Split) ──
    // Donut: Category by Area
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'area', alias: 'area' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...df, ls],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 5,
      },
      visualization: { chartType: 'donut', title: 'Category by Area', xAxis: 'area', yAxis: ['count'], showLegend: true, showLabels: true },
      layout: { x: 0, y: 3, w: 4, h: 2 },
    },
    // Heatmap: Case Category by Branch
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'branch', alias: 'branch' },
          { table: 'reports', field: 'main_category', alias: 'category' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...df, ls],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 200,
      },
      visualization: { chartType: 'heatmap', title: 'Case Category by Branch', xAxis: 'category', yAxis: ['branch'], colorField: 'count', showLegend: false, showLabels: false },
      layout: { x: 4, y: 3, w: 4, h: 2 },
    },
    // Heatmap: Case Category by Airlines
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'airline', alias: 'airline' },
          { table: 'reports', field: 'main_category', alias: 'category' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...df, ls],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 200,
      },
      visualization: { chartType: 'heatmap', title: 'Case Category by Airlines', xAxis: 'category', yAxis: ['airline'], colorField: 'count', showLegend: false, showLabels: false },
      layout: { x: 8, y: 3, w: 4, h: 2 },
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
        filters: [...df, ls],
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
      layout: { x: 0, y: 1, w: 8, h: 3 }, // WIDTH 8 (Row 1 Left)
    },
    // Table -> Bar: General Category (Small, fits in w:4)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'sub_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, ls, { table: 'reports', field: 'area', operator: 'eq' as const, value: 'GENERAL', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'horizontal_bar', title: 'General Category', xAxis: 'Category', yAxis: ['Total'], showLegend: false, showLabels: true },
      layout: { x: 8, y: 1, w: 4, h: 2 }, // WIDTH 4 (Row 1 Right)
    },
    // Table -> Bar: Terminal Area Category (Long labels, move to Row 2)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'sub_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, ls, { table: 'reports', field: 'area', operator: 'eq' as const, value: 'TERMINAL', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Terminal Area Category', xAxis: 'Category', yAxis: ['Total'], showLegend: false, showLabels: true },
      layout: { x: 0, y: 3, w: 6, h: 2 }, // WIDTH 6 (Row 2 Left)
    },
    // Table -> Bar: Apron Area Category (Long labels, move to Row 2)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'sub_category', alias: 'Category' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, ls, { table: 'reports', field: 'area', operator: 'eq' as const, value: 'APRON', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'horizontal_bar', title: 'Apron Area Category', xAxis: 'Category', yAxis: ['Total'], showLegend: false, showLabels: true },
      layout: { x: 6, y: 3, w: 6, h: 2 }, // WIDTH 6 (Row 2 Right)
    },
    // Horizontal Bar: HUB Report (Moved to Row 3)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [{ table: 'reports', field: 'hub', alias: 'hub' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'count' }],
        filters: [...df, ls],
        sorts: [{ field: 'count', direction: 'desc' }], limit: 10,
      },
      visualization: { chartType: 'horizontal_bar', title: 'HUB Report', xAxis: 'hub', yAxis: ['count'], showLegend: false, showLabels: true },
      layout: { x: 0, y: 5, w: 4, h: 2 }, // Row 3 Left
    },
    // Table: Detail Report Landside & Airside (Moved to Row 3)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'created_at', alias: 'Date' },
          { table: 'reports', field: 'main_category', alias: 'Category' },
          { table: 'reports', field: 'branch', alias: 'Branch' },
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'flight_number', alias: 'Flight' },
          { table: 'reports', field: 'report_content', alias: 'Report' },
          { table: 'reports', field: 'root_cause', alias: 'Root Caused' },
          { table: 'reports', field: 'action_taken', alias: 'Action Taken' },
          { table: 'reports', field: 'evidence_url', alias: 'Evidence' },
        ],
        measures: [],
        filters: [...df, ls],
        sorts: [{ field: 'Date', direction: 'desc' }], limit: 5000,
      },
      visualization: { chartType: 'table', title: 'Detail Report Landside & Airside', yAxis: [], showLegend: false, showLabels: false },
      layout: { x: 4, y: 5, w: 8, h: 2 }, // Row 3 Right
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
          { table: 'reports', field: 'sub_category', alias: 'Category' },
          { table: 'reports', field: 'branch', alias: 'Branch' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, ls, { table: 'reports', field: 'area', operator: 'eq' as const, value: 'TERMINAL', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], 
        limit: 100,
      },
      visualization: { 
        chartType: 'heatmap', 
        title: 'Detail Terminal Area by Branch',
        xAxis: 'Branch',
        yAxis: ['Category'],
        colorField: 'Total',
        showLegend: false,
        showLabels: true 
      },
      layout: { x: 0, y: 1, w: 4, h: 3 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'sub_category', alias: 'Category' },
          { table: 'reports', field: 'branch', alias: 'Branch' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, ls, { table: 'reports', field: 'area', operator: 'eq' as const, value: 'APRON', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], 
        limit: 100,
      },
      visualization: { 
        chartType: 'heatmap', 
        title: 'Detail Apron Area by Branch',
        xAxis: 'Branch',
        yAxis: ['Category'],
        colorField: 'Total',
        showLegend: false,
        showLabels: true 
      },
      layout: { x: 4, y: 1, w: 4, h: 3 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'sub_category', alias: 'Category' },
          { table: 'reports', field: 'branch', alias: 'Branch' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, ls, { table: 'reports', field: 'area', operator: 'eq' as const, value: 'GENERAL', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], 
        limit: 100,
      },
      visualization: { 
        chartType: 'heatmap', 
        title: 'Detail General Category by Branch',
        xAxis: 'Branch',
        yAxis: ['Category'],
        colorField: 'Total',
        showLegend: false,
        showLabels: true 
      },
      layout: { x: 8, y: 1, w: 4, h: 3 },
    },
    
    // Row 2: By Airlines (transposed - airlines are rows, categories are columns)
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'sub_category', alias: 'Category' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, ls, { table: 'reports', field: 'area', operator: 'eq' as const, value: 'TERMINAL', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], 
        limit: 100,
      },
      visualization: { 
        chartType: 'heatmap', 
        title: 'Detail Terminal Area by Airlines',
        xAxis: 'Category',
        yAxis: ['Airlines'],
        colorField: 'Total',
        showLegend: false,
        showLabels: true 
      },
      layout: { x: 0, y: 4, w: 4, h: 3 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'sub_category', alias: 'Category' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, ls, { table: 'reports', field: 'area', operator: 'eq' as const, value: 'APRON', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], 
        limit: 100,
      },
      visualization: { 
        chartType: 'heatmap', 
        title: 'Detail Apron Area by Airlines',
        xAxis: 'Category',
        yAxis: ['Airlines'],
        colorField: 'Total',
        showLegend: false,
        showLabels: true 
      },
      layout: { x: 4, y: 4, w: 4, h: 3 },
    },
    {
      id: tileId(),
      query: {
        source: 'reports', joins: [],
        dimensions: [
          { table: 'reports', field: 'airline', alias: 'Airlines' },
          { table: 'reports', field: 'sub_category', alias: 'Category' },
        ],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'Total' }],
        filters: [...df, ls, { table: 'reports', field: 'area', operator: 'eq' as const, value: 'GENERAL', conjunction: 'AND' as const }],
        sorts: [{ field: 'Total', direction: 'desc' }], 
        limit: 100,
      },
      visualization: { 
        chartType: 'heatmap', 
        title: 'Detail General Category by Airlines',
        xAxis: 'Category',
        yAxis: ['Airlines'],
        colorField: 'Total',
        showLegend: false,
        showLabels: true 
      },
      layout: { x: 8, y: 4, w: 4, h: 3 },
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4: CGO - Case Category (UQ division only)
  // ═══════════════════════════════════════════════════════════════════════════
  const page4Tiles = cloneForCGO(page1Tiles);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 5: CGO - Detail Report (UQ division only)
  // ═══════════════════════════════════════════════════════════════════════════
  const page5Tiles = cloneForCGO(page2Tiles);

  const pages: DashboardPage[] = [
    { name: '1. Case Category', tiles: page1Tiles },
    { name: '2. Detail Category', tiles: page3Tiles },
    { name: '3. Detail Report', tiles: page2Tiles },
    { name: 'CGO - Case Category', tiles: page4Tiles },
    { name: 'CGO - Detail Report', tiles: page5Tiles },
  ];

  // Strip _tag sentinel from all filters before returning
  const allTiles = pages.flatMap(p => p.tiles);
  for (const tile of allTiles) {
    tile.query.filters = tile.query.filters.map((f: any) => {
      const { _tag, ...rest } = f;
      return rest;
    });
  }

  return {
    name: `Customer Feedback ${yearRange}`,
    description: `Landside & Airside Customer Feedback ${yearRange} - Irregularity, Complaint & Compliment Report`,
    tiles: allTiles,
    pages,
    globalFilters: [],
    refreshInterval: 300,
  };
}
