'use client';

import type { QueryResult } from '@/types/builder';

const GAPURA_GREEN = '6b8e3d';
const GAPURA_BANNER = '5a7a3a';
const WHITE = 'FFFFFF';

const SLIDE = {
    GREEN: GAPURA_GREEN,
    ACCENT_GREEN: GAPURA_BANNER,
    DARK_GREEN: '3a5a2a',
    LIGHT_GREEN: 'e6f0d0',
    FONT: 'Arial',
    FOOTER_Y: 7.0 
};

interface PageData {
  name: string;
  tiles: TileData[];
}

interface TileData {
  id: string;
  title: string;
  chartType: string;
  yAxis?: string[];
}


interface ExportPayload {
  dashboardName: string;
  subtitle?: string;
  dashboardId?: string;
  baseUrl?: string;
  dateFrom?: string;
  dateTo?: string;
  sourcePage?: string;
  pages: PageData[];
  chartsData: Map<string, { queryResult?: QueryResult; stats?: { distribution: { name: string; count: number; percentage: number }[]; totalCount: number } }>;
}

interface TileInsight {
  tileId: string;
  keyFindings: string[];
  narrative?: string;
}

interface DashboardInsights {
  executiveSummary: string[];
  recommendations: string[];
  closingStatement?: string;
  tileInsights: TileInsight[];
}

// ─── column label formatter ────────────────────────────────────────────────
function formatCol(col: string): string {
  return col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getChartSlug(chartTitle: string): string {
  const title = chartTitle.toLowerCase();
  if (title.includes('report by case category')) return 'report-by-case-category';
  if (title.includes('branch report') || title.includes('hub report')) return 'branch-report';
  if (title.includes('airlines report') || title.includes('airline report')) return 'airline-report';
  if (title.includes('monthly report') || title.includes('bulanan')) return 'monthly-report';
  if (title.includes('category by area')) return 'category-by-area';
  if (title.includes('case category by branch')) return 'case-category-by-branch';
  if (title.includes('case category by airline')) return 'case-category-by-airline';
  if (title.includes('case report by area') || title.includes('report by area')) return 'area-report';
  if (title.includes('terminal area category') || title.includes('terminal area by')) return 'terminal-area-category';
  if (title.includes('apron area category') || title.includes('apron area by')) return 'apron-area-category';
  if (title.includes('general category') || title.includes('general area')) return 'general-category';
  return 'pivot-report';
}

function buildDetailUrl(payload: ExportPayload, tile: TileData): string {
  if (!payload.baseUrl) return '';
  const slug = getChartSlug(tile.title);
  const params = new URLSearchParams();
  if (payload.dateFrom) params.set('dateFrom', payload.dateFrom);
  if (payload.dateTo) params.set('dateTo', payload.dateTo);
  if (payload.sourcePage) params.set('sourcePage', payload.sourcePage);
  params.set('viewMode', 'static');
  const queryString = params.toString();
  return `${payload.baseUrl}/embed/${slug}/detail${queryString ? `?${queryString}` : ''}`;
}

// ─── XLSX EXPORT ───────────────────────────────────────────────────────────
// Complexity: Time O(pages * tiles * rows) | Space O(total_cells)
export async function exportToXlsx(payload: ExportPayload): Promise<void> {
  const XLSX = await import('xlsx-js-style');
  const wb = XLSX.utils.book_new();

  const headerStyle = {
    font: { bold: true, color: { rgb: WHITE }, sz: 11 },
    fill: { fgColor: { rgb: GAPURA_BANNER } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
    border: {
      top: { style: 'thin' as const, color: { rgb: 'CCCCCC' } },
      bottom: { style: 'thin' as const, color: { rgb: 'CCCCCC' } },
      left: { style: 'thin' as const, color: { rgb: 'CCCCCC' } },
      right: { style: 'thin' as const, color: { rgb: 'CCCCCC' } },
    },
  };

  const cellBorder = {
    top: { style: 'thin' as const, color: { rgb: 'E0E0E0' } },
    bottom: { style: 'thin' as const, color: { rgb: 'E0E0E0' } },
    left: { style: 'thin' as const, color: { rgb: 'E0E0E0' } },
    right: { style: 'thin' as const, color: { rgb: 'E0E0E0' } },
  };

  for (const page of payload.pages) {
    const sheetData: Record<string, unknown>[][] = [];
    const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

    // Page title row
    sheetData.push([{
      v: `${payload.dashboardName} — ${page.name}`,
      s: {
        font: { bold: true, sz: 14, color: { rgb: GAPURA_GREEN } },
        alignment: { horizontal: 'left' as const },
      },
    }]);

    // Subtitle
    if (payload.subtitle) {
      sheetData.push([{
        v: payload.subtitle,
        s: { font: { italic: true, sz: 10, color: { rgb: '888888' } } },
      }]);
    }

    // Empty separator
    sheetData.push([]);

    let maxCols = 1;

    for (const tile of page.tiles) {
      const cr = payload.chartsData.get(tile.id);
      if (!cr) continue;

      // Tile title
      sheetData.push([{
        v: tile.title,
        s: {
          font: { bold: true, sz: 12, color: { rgb: WHITE } },
          fill: { fgColor: { rgb: GAPURA_GREEN } },
          alignment: { horizontal: 'left' as const },
        },
      }]);

      if (cr.queryResult) {
        const cols = cr.queryResult.columns;
        if (cols.length > maxCols) maxCols = cols.length;

        // Header row
        sheetData.push(cols.map(c => ({ v: formatCol(c), s: headerStyle })));

        // Data rows
        const rows = cr.queryResult.rows as Record<string, unknown>[];
        for (const row of rows) {
          sheetData.push(cols.map(c => {
            const val = row[c];
            const numVal = Number(val);
            const isNum = !isNaN(numVal) && val !== null && val !== '' && typeof val !== 'boolean';
            return {
              v: isNum ? numVal : (val ?? ''),
              t: isNum ? 'n' as const : 's' as const,
              s: {
                border: cellBorder,
                alignment: { horizontal: isNum ? 'center' as const : 'left' as const },
                font: { sz: 10 },
              },
            };
          }));
        }
      } else if (cr.stats) {
        if (3 > maxCols) maxCols = 3;
        sheetData.push([
          { v: 'Nama', s: headerStyle },
          { v: 'Jumlah', s: headerStyle },
          { v: 'Persentase', s: headerStyle },
        ]);

        for (const item of cr.stats.distribution) {
          sheetData.push([
            { v: item.name, s: { border: cellBorder, font: { sz: 10 } } },
            { v: item.count, t: 'n' as const, s: { border: cellBorder, alignment: { horizontal: 'center' as const }, font: { sz: 10 } } },
            { v: `${item.percentage}%`, s: { border: cellBorder, alignment: { horizontal: 'center' as const }, font: { sz: 10 } } },
          ]);
        }
      }

      // Separator
      sheetData.push([]);
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData.map(r =>
      (r as { v: unknown; t?: string; s?: unknown }[]).map(c => (typeof c === 'object' && c !== null && 'v' in c ? c : { v: '' }))
    ));

    // Merge title row across all columns
    if (maxCols > 1) {
      merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: maxCols - 1 } });
    }
    ws['!merges'] = merges;

    // Column widths
    ws['!cols'] = Array.from({ length: maxCols }, () => ({ wch: 18 }));

    const safeName = page.name.replace(/[\\/*?[\]]/g, '').slice(0, 31) || 'Sheet';
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${payload.dashboardName}.xlsx`);
}

// ─── Fetch AI insights ─────────────────────────────────────────────────────
// Complexity: Time O(pages * tiles) | Space O(tiles * sample_rows)
async function fetchInsights(payload: ExportPayload): Promise<DashboardInsights | null> {
  try {
    interface TileSummary {
      id: string;
      title: string;
      chartType: string;
      columns: string[];
      sampleRows: Record<string, unknown>[];
      rowCount: number;
    }

    const tiles: TileSummary[] = [];
    for (const page of payload.pages) {
      for (const tile of page.tiles) {
        const cr = payload.chartsData.get(tile.id);
        if (!cr) continue;

        if (cr.queryResult && cr.queryResult.rows.length > 0) {
          tiles.push({
            id: tile.id,
            title: tile.title,
            chartType: tile.chartType,
            columns: cr.queryResult.columns,
            sampleRows: (cr.queryResult.rows as Record<string, unknown>[]).slice(0, 8),
            rowCount: cr.queryResult.rowCount,
          });
        } else if (cr.stats) {
          tiles.push({
            id: tile.id,
            title: tile.title,
            chartType: tile.chartType,
            columns: ['nama', 'jumlah', 'persen'],
            sampleRows: cr.stats.distribution.slice(0, 8).map(d => ({
              nama: d.name, jumlah: d.count, persen: `${d.percentage}%`,
            })),
            rowCount: cr.stats.totalCount,
          });
        }
      }
    }

    if (tiles.length === 0) return null;

    const res = await fetch('/api/dashboards/export-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dashboardName: payload.dashboardName,
        subtitle: payload.subtitle,
        tiles,
      }),
    });

    if (!res.ok) {
      console.error('[fetchInsights] API responded', res.status);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error('[fetchInsights] Failed:', e);
    return null;
  }
}

// ─── PPTX EXPORT — Dashboard-Style Analyst Presentation ────────────────────
// Complexity: Time O(pages * tiles * rows + 1 AI call) | Space O(total_cells)
export async function exportToPptx(payload: ExportPayload): Promise<void> {
  const [PptxGenJS, insights] = await Promise.all([
    import('pptxgenjs').then(m => m.default),
    fetchInsights(payload),
  ]);

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Gapura Indonesia';
  pptx.subject = payload.dashboardName;

  const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  let slideNum = 0;

  type PptxSlide = ReturnType<InstanceType<typeof PptxGenJS>['addSlide']>;

  // ─── Slide chrome: header bar + footer ─────────────────────────────────
  // Complexity: Time O(1) | Space O(1)
  function addSlideChrome(slide: PptxSlide, title: string): void {
    slideNum++;
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.85, fill: { color: SLIDE.GREEN } });
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.85, w: '100%', h: 0.05, fill: { color: SLIDE.ACCENT_GREEN } });

    // Logo placeholder (small green rectangle as brand mark)
    slide.addShape(pptx.ShapeType.rect, { x: 0.25, y: 0.2, w: 0.25, h: 0.45, fill: { color: SLIDE.GREEN }, rectRadius: 0.05 });
    slide.addShape(pptx.ShapeType.rect, { x: 0.55, y: 0.28, w: 0.08, h: 0.28, fill: { color: WHITE, transparency: 30 }, rectRadius: 0.02 });

    // Title 
    slide.addText(title, { 
      x: 0.75, y: 0.15, w: '85%', h: 0.55, 
      fontSize: 20, fontFace: SLIDE.FONT, color: WHITE, bold: true 
    });

    // Footer with enhanced branding
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: SLIDE.FOOTER_Y, w: '100%', h: 0.35, fill: { color: 'F5F5F5' } });
    // Brand accent line
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: SLIDE.FOOTER_Y, w: 0.08, h: 0.35, fill: { color: SLIDE.GREEN } });
    slide.addText(`PT Gapura Angkasa  |  ${dateStr}`, { x: 0.4, y: SLIDE.FOOTER_Y, w: '60%', h: 0.35, fontSize: 8, fontFace: SLIDE.FONT, color: '666666' });
    slide.addText(`Halaman ${slideNum}`, { x: 12.0, y: SLIDE.FOOTER_Y, w: 1.0, h: 0.35, fontSize: 8, fontFace: SLIDE.FONT, color: '999999', align: 'right' });
  }

  // ─── Mini insight callout ──────────────────────────────────────────────
  // Complexity: Time O(findings.length) | Space O(1)
  function addMiniInsight(slide: PptxSlide, findings: string[], x: number, y: number, w: number): void {
    const lines = findings.slice(0, 3);
    // Adjusted height calculation
    const h = 0.4 + lines.length * 0.25; 
    
    // Card background with shadow effect
    slide.addShape(pptx.ShapeType.roundRect, { 
      x, y, w, h, 
      fill: { color: 'F9FCF5' }, 
      rectRadius: 0.05,
      line: { color: SLIDE.ACCENT_GREEN, width: 0.5 }
    });
    
    // "Insight" Label pill
    slide.addShape(pptx.ShapeType.roundRect, {
        x: x + 0.15, y: y + 0.15, w: 1.2, h: 0.2,
        fill: { color: SLIDE.GREEN }, rectRadius: 0.1
    });
    slide.addText('KEY INSIGHTS', { 
        x: x + 0.15, y: y + 0.15, w: 1.2, h: 0.2, 
        fontSize: 7, fontFace: SLIDE.FONT, color: WHITE, bold: true, align: 'center', valign: 'middle' 
    });

    // Insight Bullets
    const text = lines.map(f => `•  ${f}`).join('\n');
    slide.addText(text, { 
        x: x + 0.2, y: y + 0.45, w: w - 0.4, h: lines.length * 0.25, 
        fontSize: 9, fontFace: SLIDE.FONT, color: '444444', lineSpacingMultiple: 1.2 
    });
  }

  // ─── Panel subtitle bar ────────────────────────────────────────────────
  // Complexity: Time O(1) | Space O(1)
  function addPanelHeader(slide: PptxSlide, title: string, x: number, y: number, w: number, linkUrl?: string): void {
    // Header Background
    slide.addShape(pptx.ShapeType.roundRect, { 
        x, y, w, h: 0.4, 
        fill: { color: 'FFFFFF' }, 
        rectRadius: 0.05,
        shadow: { type: 'outer', blur: 3, offset: 2, angle: 45, color: '000000', opacity: 0.1 }
    });
    
    // Green Left Accent
    slide.addShape(pptx.ShapeType.rect, { 
        x, y: y + 0.05, w: 0.06, h: 0.3, 
        fill: { color: SLIDE.GREEN } 
    });
    
    // Title Text
    slide.addText(title, { 
        x: x + 0.15, y, w: w - 1.2, h: 0.4, 
        fontSize: 11, fontFace: SLIDE.FONT, color: '222222', bold: true, valign: 'middle',
        hyperlink: linkUrl ? { url: linkUrl } : undefined
    });

    // Metadata / Link hint
    if (linkUrl) {
        slide.addText('View Detail ↗', {
            x: x + w - 1.3, y: y + 0.1, w: 1.2, h: 0.2,
            fontSize: 7, fontFace: SLIDE.FONT, color: SLIDE.GREEN, align: 'right',
            hyperlink: { url: linkUrl }
        });
    }
  }

  // ─── Compact data table ────────────────────────────────────────────────
  // Complexity: Time O(rows * cols) | Space O(rows * cols)
  function addCompactTable(slide: PptxSlide, cols: string[], rows: Record<string, unknown>[], x: number, y: number, w: number, maxRows: number, linkUrl?: string): number {
    const display = rows.slice(0, maxRows);
    const colW = cols.map(() => w / cols.length);

    // Modern Header Style
    const headerRow = cols.map(c => ({
      text: formatCol(c),
      options: { 
            fontSize: 8, fontFace: SLIDE.FONT, color: WHITE, bold: true, 
          fill: { color: SLIDE.DARK_GREEN }, 
          align: 'center' as const, 
          border: [null, null, { pt: 1, color: WHITE }, null] as any
      },
    }));

    const dataRows = display.map((row, ri) =>
      cols.map(c => {
        const val = row[c];
        const numVal = Number(val);
        const isNum = !isNaN(numVal) && val !== null && val !== '' && typeof val !== 'boolean';
        return {
          text: isNum ? numVal.toLocaleString('id-ID') : String(val ?? '-'),
          options: {
            fontSize: 8, fontFace: SLIDE.FONT, color: '333333',
            fill: { color: ri % 2 === 0 ? 'FFFFFF' : 'F4F8F1' }, // Alternating rows with very light green
            align: (isNum ? 'right' : 'left') as 'right' | 'left', // Numbers right aligned
            border: [null, null, { pt: 0.5, color: 'E0E0E0' }, null] as any,
            // Add slight padding
            margin: 0.05,
            hyperlink: linkUrl ? { url: linkUrl } : undefined,
          },
        };
      })
    );

    slide.addTable([headerRow, ...dataRows], { x, y, w, colW, rowH: 0.25 });

    const tableEndY = y + (display.length + 1) * 0.25;

    if (rows.length > maxRows) {
      slide.addText(`Showing ${maxRows} of ${rows.length} rows`, { 
          x, y: tableEndY, w, h: 0.2, 
          fontSize: 7, fontFace: SLIDE.FONT, color: '999999', italic: true, align: 'right' 
      });
      return tableEndY + 0.2;
    }
    return tableEndY;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 1: Title
  // ═══════════════════════════════════════════════════════════════════════
  const titleSlide = pptx.addSlide();
  slideNum++;
  // Enhanced gradient-like background
  titleSlide.background = { color: 'F5F9F0' };
  
  // Decorative geometric shapes for modern look
  titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '35%', h: '100%', fill: { color: SLIDE.GREEN } });
  titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.15, h: '100%', fill: { color: SLIDE.DARK_GREEN } });
  
  // Decorative circles for modern feel
  titleSlide.addShape(pptx.ShapeType.ellipse, { x: 9.5, y: 5.2, w: 2.8, h: 2.8, fill: { color: 'D4E8C0', transparency: 60 } });
  titleSlide.addShape(pptx.ShapeType.ellipse, { x: 10.5, y: 6.2, w: 1.8, h: 1.8, fill: { color: 'E8F0D8', transparency: 40 } });

  // Accent Line
  titleSlide.addShape(pptx.ShapeType.rect, { x: 3.5, y: 0, w: 0.08, h: '100%', fill: { color: SLIDE.ACCENT_GREEN } });

  // Title Content
  titleSlide.addText(payload.dashboardName.toUpperCase(), {
    x: 0.5, y: 2.3, w: 5, h: 1.5,
    fontSize: 44, fontFace: 'Arial Black', color: WHITE, bold: true, charSpacing: 1, valign: 'top'
  });
  
  // Decorative underline
  titleSlide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 3.9, w: 3.5, h: 0.04, fill: { color: 'D4E8C0' } });
  
  titleSlide.addText(payload.subtitle || 'Executive Dashboard Export', {
    x: 0.5, y: 4.1, w: 5, h: 0.5, fontSize: 16, fontFace: SLIDE.FONT, color: 'D4E8C0', italic: true,
  });

  // Right Side Info with branding
  titleSlide.addText(`PT GAPURA ANGKASA`, {
    x: 5, y: 0.4, w: 6, h: 0.5, fontSize: 12, fontFace: SLIDE.FONT, color: SLIDE.GREEN, bold: true, charSpacing: 1,
  });
  
  // Separator line
  titleSlide.addShape(pptx.ShapeType.rect, { x: 5, y: 0.95, w: 2, h: 0.02, fill: { color: SLIDE.GREEN } });
  
  titleSlide.addText(dateStr, {
    x: 5, y: 1.1, w: 6, h: 0.4, fontSize: 11, fontFace: SLIDE.FONT, color: '666666',
  });

  // Page indicator
  titleSlide.addText('EXPORTED PRESENTATION', {
    x: 5, y: 1.6, w: 6, h: 0.3, fontSize: 9, fontFace: SLIDE.FONT, color: '999999', charSpacing: 1,
  });

  // Bottom branding
  titleSlide.addText('CONFIDENTIAL', {
    x: 5, y: 6.5, w: 6, h: 0.3, fontSize: 8, fontFace: SLIDE.FONT, color: 'DDDDDD', charSpacing: 2,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Separate tiles into KPIs vs data charts for dashboard grouping
  // ═══════════════════════════════════════════════════════════════════════
  interface TileWithData {
    tile: TileData;
    cr: { queryResult?: QueryResult; stats?: { distribution: { name: string; count: number; percentage: number }[]; totalCount: number } };
    insight?: TileInsight;
  }

  let isFirstPage = true;

  for (const page of payload.pages) {
    const kpiTiles: TileWithData[] = [];
    const dataTiles: TileWithData[] = [];

    for (const tile of page.tiles) {
      const cr = payload.chartsData.get(tile.id);
      if (!cr) continue;
      const insight = insights?.tileInsights?.find(ti => ti.tileId === tile.id);
      const tw: TileWithData = { tile, cr, insight };
      if (tile.chartType === 'kpi') kpiTiles.push(tw);
      else dataTiles.push(tw);
    }

    // ─── Page divider (if multi-page) ──────────────────────────────────
    if (payload.pages.length > 1) {
      const divSlide = pptx.addSlide();
      slideNum++;
      divSlide.background = { color: 'FFFFFF' };
      divSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 3.0, w: '100%', h: 1.5, fill: { color: 'F7F9F4' } });
      divSlide.addText(page.name, {
        x: 0, y: 3.1, w: '100%', h: 1.3, fontSize: 32, fontFace: SLIDE.FONT, color: SLIDE.GREEN, bold: true, align: 'center', valign: 'middle',
      });
      divSlide.addShape(pptx.ShapeType.rect, { x: 5.5, y: 4.8, w: 2.3, h: 0.05, fill: { color: SLIDE.ACCENT_GREEN } });
    }

    // ═════════════════════════════════════════════════════════════════════
    // SLIDE: KPI Overview + Executive Summary (exec summary only on first page)
    // ═════════════════════════════════════════════════════════════════════
    const showExecSummary = isFirstPage && insights?.executiveSummary && insights.executiveSummary.length > 0;

    if (kpiTiles.length > 0 || showExecSummary) {
      const overviewSlide = pptx.addSlide();
      addSlideChrome(overviewSlide, payload.pages.length > 1 ? `${page.name} — Overview` : 'Dashboard Overview');

      // ── KPI cards row ──────────────────────────────────────────────
      if (kpiTiles.length > 0) {
        const cardCount = Math.min(kpiTiles.length, 5);
        const totalW = 12.5;
        const gap = 0.3;
        const cardW = (totalW - (cardCount - 1) * gap) / cardCount;
        const cardH = 1.8;
        const startY = 1.2;

        kpiTiles.slice(0, 5).forEach((tw, i) => {
          const x = 0.4 + i * (cardW + gap);

          // Extract KPI value using yAxis key (matches live dashboard logic)
          let val: string | number = '-';
          if (tw.cr.queryResult && tw.cr.queryResult.rows.length > 0) {
            const row = tw.cr.queryResult.rows[0] as Record<string, unknown>;
            const yKey = tw.tile.yAxis?.[0] || tw.cr.queryResult.columns[tw.cr.queryResult.columns.length - 1];
            val = Number(row[yKey]) || 0;
          } else if (tw.cr.stats) {
            val = tw.cr.stats.totalCount;
          }

          // Use tile title as label (more descriptive than column alias)
          const label = tw.tile.title;
          
          const linkUrl = buildDetailUrl(payload, tw.tile);

          overviewSlide.addShape(pptx.ShapeType.roundRect, {
            x, y: startY, w: cardW, h: cardH,
            fill: { color: 'FFFFFF' }, rectRadius: 0.1,
            line: { color: 'E0E0E0', width: 0.5 },
            shadow: { type: 'outer', blur: 5, offset: 2, color: '000000', opacity: 0.1 }
          });
          
          overviewSlide.addText(typeof val === 'number' ? val.toLocaleString('id-ID') : String(val), {
            x, y: startY + 0.3, w: cardW, h: 0.8,
            fontSize: cardCount <= 3 ? 48 : 36, fontFace: 'Arial', color: SLIDE.GREEN, bold: true, align: 'center', valign: 'middle',
            hyperlink: linkUrl ? { url: linkUrl } : undefined
          });
          
          // Visual indicator bar
          overviewSlide.addShape(pptx.ShapeType.rect, { 
            x: x + cardW/2 - 0.5, y: startY + 1.1, w: 1.0, h: 0.03, 
            fill: { color: SLIDE.GREEN } 
          });
          
          overviewSlide.addText(formatCol(label).toUpperCase(), {
            x, y: startY + 1.25, w: cardW, h: 0.35,
            fontSize: 8, fontFace: SLIDE.FONT, color: '777777', align: 'center', valign: 'top',
          });
        });
      }

      // ── Executive summary (first page only) ──────────────────────────────────
      if (showExecSummary) {
        const execY = kpiTiles.length > 0 ? 3.5 : 1.2;
        
        overviewSlide.addShape(pptx.ShapeType.roundRect, { 
            x: 0.4, y: execY, w: 12.5, h: 3.5, 
            fill: { color: 'F8FAF4' }, 
            rectRadius: 0.1,
            line: { color: SLIDE.LIGHT_GREEN, width: 0.5 } 
        });

        overviewSlide.addText('EXECUTIVE SUMMARY', {
          x: 0.6, y: execY + 0.2, w: 4, h: 0.3, 
          fontSize: 12, fontFace: SLIDE.FONT, color: SLIDE.DARK_GREEN, bold: true
        });
        
        overviewSlide.addShape(pptx.ShapeType.line, {
            x: 0.6, y: execY + 0.55, w: 12.1, h: 0, 
            line: { color: SLIDE.ACCENT_GREEN, width: 1 }
        });

        insights!.executiveSummary.slice(0, 5).forEach((point, i) => {
          const bulletY = execY + 0.7 + i * 0.5;
          overviewSlide.addText('►', {
             x: 0.6, y: bulletY, w: 0.2, h: 0.3, fontSize: 10, color: SLIDE.GREEN
          });
          overviewSlide.addText(point, {
            x: 0.85, y: bulletY, w: 11.5, h: 0.4, fontSize: 11, fontFace: SLIDE.FONT, color: '333333', valign: 'top',
          });
        });
      }
    }

    isFirstPage = false;

    // ═════════════════════════════════════════════════════════════════════
    // DASHBOARD SLIDES: Data tiles grouped 2-per-slide
    // ═════════════════════════════════════════════════════════════════════
    const panelPairs: TileWithData[][] = [];
    for (let i = 0; i < dataTiles.length; i += 2) {
      panelPairs.push(dataTiles.slice(i, i + 2));
    }

    for (const pair of panelPairs) {
      const dashSlide = pptx.addSlide();
      const pageLabel = payload.pages.length > 1 ? `${page.name} — Data Analysis` : 'Data Analysis';
      addSlideChrome(dashSlide, pageLabel);

      const isSingle = pair.length === 1;
      const panelW = isSingle ? 12.5 : 6.1;
      const panelGap = 0.3;
      const contentY = 1.1; // Lowered slightly to account for thicker header
      const maxTableRows = isSingle ? 14 : 9;

      pair.forEach((tw, pi) => {
        const xBase = isSingle ? 0.4 : (pi === 0 ? 0.4 : 0.4 + panelW + panelGap);

        // Link generation
        const linkUrl = buildDetailUrl(payload, tw.tile);

        // Panel header with shadows and link
        addPanelHeader(dashSlide, tw.tile.title, xBase, contentY, panelW, linkUrl);

        let yEnd = contentY + 0.5;

        // Render chart for stats (distribution data) - show chart instead of table
        if (tw.cr.stats && tw.cr.stats.distribution.length > 0) {
          const chartData = tw.cr.stats.distribution.slice(0, 8).map(d => ({ name: d.name, count: d.count }));
          const chartH = 2.2;
          const chartY = yEnd;
          
          // Add chart title
          dashSlide.addText('Distribusi Data', {
            x: xBase, y: chartY - 0.2, w: panelW, h: 0.2,
            fontSize: 9, fontFace: SLIDE.FONT, color: '666666', italic: true
          });
          
          // Render bar chart
          try {
            const labels = chartData.map(d => d.name.length > 12 ? d.name.substring(0, 12) + '...' : d.name);
            const values = chartData.map(d => d.count);
            
            // Format: [{ name, labels, values }]
            const chartSeries = [{ name: 'Jumlah', labels, values }];
            
            dashSlide.addChart(pptx.ChartType.bar, chartSeries as any, {
              x: xBase, y: chartY, w: panelW, h: chartH,
              barDir: 'col',
              barGrouping: 'clustered',
              showValue: true,
              legendPos: 'b',
              legendFontSize: 8,
              catAxisLabelColor: '333333',
              catAxisLabelFontSize: 8,
            } as any);
            
            yEnd = chartY + chartH + 0.15;
          } catch (e) {
            console.error('Chart render failed:', e);
          }
           
          // Skip table for stats data - just show chart
        } else if (tw.cr.queryResult && tw.cr.queryResult.rows.length > 0) {
          const rawCols = tw.cr.queryResult.columns;
          const rows = tw.cr.queryResult.rows as Record<string, unknown>[];
          
          // Try to extract chart data from queryResult if there's a label column and value columns
          const labelCol = rawCols[0];
          const numericCols = rawCols.filter(c => {
            const val = rows[0]?.[c];
            return typeof val === 'number' || (!isNaN(Number(val)) && val !== null);
          });
          
          // If we have at least one numeric column, try to render a chart
          if (labelCol && numericCols.length > 0 && rows.length <= 10) {
            const valueCol = numericCols[0];
            const labels = rows.map(r => String(r[labelCol] || 'N/A').substring(0, 15));
            const values = rows.map(r => Number(r[valueCol]) || 0);
            
            const chartH = 2.2;
            const chartY = yEnd;
            
            dashSlide.addText('Data Visualization', {
              x: xBase, y: chartY - 0.2, w: panelW, h: 0.2,
              fontSize: 9, fontFace: SLIDE.FONT, color: '666666', italic: true
            });
            
            try {
              dashSlide.addChart(pptx.ChartType.bar, [
                { name: formatCol(valueCol), labels, values }
              ], {
                x: xBase, y: chartY, w: panelW, h: chartH,
                barDir: 'col',
                barGrouping: 'clustered',
                showValue: true,
                legendPos: 'b',
                legendFontSize: 8,
                catAxisLabelColor: '333333',
                catAxisLabelFontSize: 8,
              });
              yEnd = chartY + chartH + 0.15;
            } catch (e) {
              console.error('Chart render failed for queryResult:', e);
            }
          }
          
          // Also show the table below the chart
          if (yEnd === contentY + 0.5) {
            // No chart was rendered, show table only
            const seen = new Set<string>();
            const displayCols = rawCols.filter(c => {
              if (seen.has(c)) return false;
              seen.add(c);
              return true;
            }).slice(0, isSingle ? 8 : 4);
            yEnd = addCompactTable(dashSlide, displayCols, rows, xBase, yEnd, panelW, maxTableRows, linkUrl);
          } else {
            // Chart was rendered, show smaller table below
            const seen = new Set<string>();
            const displayCols = rawCols.filter(c => {
              if (seen.has(c)) return false;
              seen.add(c);
              return true;
            }).slice(0, isSingle ? 6 : 3);
            const tableMaxRows = isSingle ? 6 : 4;
            yEnd = addCompactTable(dashSlide, displayCols, rows, xBase, yEnd, panelW, tableMaxRows, linkUrl);
          }
        } else if (!tw.cr.queryResult || tw.cr.queryResult.rows.length === 0) {
             dashSlide.addText('No Data Available', { x: xBase, y: yEnd, w: panelW, h: 0.5, align: 'center', color: '999999', italic: true });
        }

        // Mini insight box below the table
        if (tw.insight?.keyFindings && tw.insight.keyFindings.length > 0) {
          const insightY = Math.max(yEnd + 0.2, 5.2);
          addMiniInsight(dashSlide, tw.insight.keyFindings, xBase, insightY, panelW);

          // Per-tile narrative below insight card
          if (tw.insight.narrative) {
            const narrativeY = insightY + 0.5 + tw.insight.keyFindings.slice(0, 3).length * 0.25;
            dashSlide.addText(tw.insight.narrative, {
              x: xBase + 0.1, y: narrativeY, w: panelW - 0.2, h: 0.4,
              fontSize: 8, fontFace: SLIDE.FONT, color: '666666', italic: true, valign: 'top',
            });
          }
        }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CLOSING SLIDE: Recommendations
  // ═══════════════════════════════════════════════════════════════════════
  if (insights?.recommendations && insights.recommendations.length > 0) {
    const recSlide = pptx.addSlide();
    addSlideChrome(recSlide, 'Rekomendasi & Langkah Selanjutnya');

    // Header accent
    recSlide.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.0, w: 0.06, h: 5.5, fill: { color: SLIDE.LIGHT_GREEN } });

    insights.recommendations.forEach((rec, i) => {
      const yPos = 0.9 + i * 0.75;
      // Numbered circle
      recSlide.addShape(pptx.ShapeType.ellipse, {
        x: 0.55, y: yPos + 0.05, w: 0.25, h: 0.25,
        fill: { color: SLIDE.GREEN },
      });
      recSlide.addText(String(i + 1), {
        x: 0.55, y: yPos + 0.05, w: 0.25, h: 0.25,
        fontSize: 10, fontFace: SLIDE.FONT, color: WHITE, align: 'center', valign: 'middle', bold: true,
      });
      recSlide.addText(rec, {
        x: 0.95, y: yPos, w: 11.5, h: 0.35,
        fontSize: 11, fontFace: SLIDE.FONT, color: '333333', valign: 'middle',
      });
    });

    if (insights.closingStatement) {
      const closingY = 0.85 + insights.recommendations.length * 0.75 + 0.4;
      recSlide.addShape(pptx.ShapeType.roundRect, {
        x: 0.4, y: closingY, w: 12.5, h: 0.6,
        fill: { color: SLIDE.LIGHT_GREEN }, rectRadius: 0.08,
      });
      recSlide.addShape(pptx.ShapeType.rect, { x: 0.4, y: closingY, w: 0.08, h: 0.6, fill: { color: SLIDE.GREEN } });
      recSlide.addText(insights.closingStatement, {
        x: 0.55, y: closingY + 0.03, w: 12.2, h: 0.5,
        fontSize: 9, fontFace: SLIDE.FONT, color: SLIDE.DARK_GREEN, italic: true, valign: 'middle',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CLOSING SLIDE: Thank You
  // ═══════════════════════════════════════════════════════════════════════
  const endSlide = pptx.addSlide();
  slideNum++;
  endSlide.background = { color: SLIDE.GREEN };
  
  // Left dark accent
  endSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.15, h: '100%', fill: { color: SLIDE.DARK_GREEN } });
  
  // Decorative elements
  endSlide.addShape(pptx.ShapeType.ellipse, { x: 8, y: 1, w: 4, h: 4, fill: { color: 'D4E8C0', transparency: 70 } });
  endSlide.addShape(pptx.ShapeType.ellipse, { x: 10, y: 5, w: 3, h: 3, fill: { color: 'E8F0D8', transparency: 50 } });
  
  // Thank you text
  endSlide.addText('TERIMA KASIH', {
    x: 0.9, y: 2.3, w: '80%', h: 1.0,
    fontSize: 42, fontFace: SLIDE.FONT, color: WHITE, bold: true, charSpacing: 6,
  });
  
  // Decorative underline
  endSlide.addShape(pptx.ShapeType.rect, { x: 0.9, y: 3.5, w: 3.5, h: 0.03, fill: { color: 'D4E8C0' } });
  
  // Company info
  endSlide.addText('PT GAPURA ANGKASA', {
    x: 0.9, y: 3.7, w: '80%', h: 0.4, fontSize: 14, fontFace: SLIDE.FONT, color: 'C0D8A0', bold: true, charSpacing: 2,
  });
  
  endSlide.addText(dateStr, {
    x: 0.9, y: 4.15, w: '80%', h: 0.35, fontSize: 11, fontFace: SLIDE.FONT, color: 'A8C67F',
  });
  
  // Footer branding
  endSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 6.8, w: '100%', h: 0.8, fill: { color: SLIDE.DARK_GREEN, transparency: 30 } });
  endSlide.addText('Laporan ini digenerate secara otomatis oleh Gapura Analytics', {
    x: 0.5, y: 6.95, w: '90%', h: 0.5, fontSize: 9, fontFace: SLIDE.FONT, color: 'D4E8C0', align: 'center',
  });

  const outBuf = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
  downloadBlob(
    new Blob([outBuf], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }),
    `${payload.dashboardName}.pptx`,
  );
}

// ─── Download helper ───────────────────────────────────────────────────────
// Complexity: Time O(1) | Space O(blob_size)
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  // Teardown after browser picks up the download
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
