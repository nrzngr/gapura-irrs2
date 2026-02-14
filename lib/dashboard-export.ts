'use client';

import type { QueryResult } from '@/types/builder';

const GAPURA_GREEN = '6b8e3d';
const GAPURA_BANNER = '5a7a3a';
const WHITE = 'FFFFFF';

interface PageData {
  name: string;
  tiles: TileData[];
}

interface TileData {
  id: string;
  title: string;
  chartType: string;
}

interface ExportPayload {
  dashboardName: string;
  subtitle?: string;
  pages: PageData[];
  chartsData: Map<string, { queryResult?: QueryResult; stats?: { distribution: { name: string; count: number; percentage: number }[]; totalCount: number } }>;
}

// ─── column label formatter ────────────────────────────────────────────────
function formatCol(col: string): string {
  return col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

// ─── AI Insights types ─────────────────────────────────────────────────────
interface TileInsight {
  tileId: string;
  keyFindings: string[];
  narrative: string;
}

interface AiInsights {
  executiveSummary: string[];
  tileInsights: TileInsight[];
  recommendations: string[];
  closingStatement: string;
}

// ─── Fetch AI insights ─────────────────────────────────────────────────────
// Complexity: Time O(1) network call | Space O(response)
async function fetchInsights(payload: ExportPayload): Promise<AiInsights | null> {
  try {
    const tiles = payload.pages.flatMap(p =>
      p.tiles.map(t => {
        const cr = payload.chartsData.get(t.id);
        const qr = cr?.queryResult;
        return {
          id: t.id,
          title: t.title,
          chartType: t.chartType,
          columns: qr?.columns ?? [],
          sampleRows: (qr?.rows as Record<string, unknown>[] ?? []).slice(0, 8),
          rowCount: qr?.rows.length ?? 0,
        };
      })
    );

    const res = await fetch('/api/dashboards/export-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dashboardName: payload.dashboardName,
        subtitle: payload.subtitle,
        tiles,
      }),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Slide styling constants ───────────────────────────────────────────────
const SLIDE = {
  GREEN: GAPURA_GREEN,
  DARK_GREEN: GAPURA_BANNER,
  LIGHT_GREEN: 'EAF2DE',
  ACCENT_GREEN: '8FBC5A',
  TITLE_H: 0.65,
  FONT: 'Segoe UI',
  FOOTER_Y: 7.15,
} as const;

type BorderTuple = [{ pt: number; color: string }, { pt: number; color: string }, { pt: number; color: string }, { pt: number; color: string }];
const thinBorder = (color: string): BorderTuple => [
  { pt: 0.5, color }, { pt: 0.5, color }, { pt: 0.5, color }, { pt: 0.5, color },
];

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
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.55, fill: { color: SLIDE.GREEN } });
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.55, w: '100%', h: 0.025, fill: { color: SLIDE.ACCENT_GREEN } });
    slide.addText(title, { x: 0.4, y: 0.06, w: '88%', h: 0.44, fontSize: 15, fontFace: SLIDE.FONT, color: WHITE, bold: true });
    // Footer
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: SLIDE.FOOTER_Y, w: '100%', h: 0.35, fill: { color: 'F5F5F5' } });
    slide.addText(`Gapura Indonesia  |  ${dateStr}`, { x: 0.4, y: SLIDE.FOOTER_Y, w: '60%', h: 0.35, fontSize: 7, fontFace: SLIDE.FONT, color: 'AAAAAA' });
    slide.addText(String(slideNum), { x: 11.5, y: SLIDE.FOOTER_Y, w: 1.5, h: 0.35, fontSize: 7, fontFace: SLIDE.FONT, color: 'AAAAAA', align: 'right' });
  }

  // ─── Mini insight callout ──────────────────────────────────────────────
  // Complexity: Time O(findings.length) | Space O(1)
  function addMiniInsight(slide: PptxSlide, findings: string[], x: number, y: number, w: number): void {
    const lines = findings.slice(0, 3);
    const h = 0.2 + lines.length * 0.2;
    slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: SLIDE.LIGHT_GREEN }, rectRadius: 0.04 });
    slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.05, h, fill: { color: SLIDE.GREEN } });
    slide.addText('Key Findings', { x: x + 0.15, y, w: w - 0.2, h: 0.2, fontSize: 7, fontFace: SLIDE.FONT, color: SLIDE.DARK_GREEN, bold: true });
    const text = lines.map(f => `•  ${f}`).join('\n');
    slide.addText(text, { x: x + 0.15, y: y + 0.18, w: w - 0.2, h: lines.length * 0.2, fontSize: 7, fontFace: SLIDE.FONT, color: '555555', lineSpacingMultiple: 1.1 });
  }

  // ─── Panel subtitle bar ────────────────────────────────────────────────
  // Complexity: Time O(1) | Space O(1)
  function addPanelHeader(slide: PptxSlide, title: string, x: number, y: number, w: number): void {
    slide.addShape(pptx.ShapeType.rect, { x, y, w, h: 0.3, fill: { color: 'F7F9F4' } });
    slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.04, h: 0.3, fill: { color: SLIDE.GREEN } });
    slide.addText(title, { x: x + 0.12, y, w: w - 0.15, h: 0.3, fontSize: 9, fontFace: SLIDE.FONT, color: '444444', bold: true, valign: 'middle' });
  }

  // ─── Compact data table ────────────────────────────────────────────────
  // Complexity: Time O(rows * cols) | Space O(rows * cols)
  function addCompactTable(slide: PptxSlide, cols: string[], rows: Record<string, unknown>[], x: number, y: number, w: number, maxRows: number): number {
    const display = rows.slice(0, maxRows);
    const colW = cols.map(() => w / cols.length);

    const headerRow = cols.map(c => ({
      text: formatCol(c),
      options: { fontSize: 7, fontFace: SLIDE.FONT, color: WHITE, bold: true, fill: { color: SLIDE.DARK_GREEN }, align: 'center' as const, border: thinBorder('CCCCCC') },
    }));

    const dataRows = display.map((row, ri) =>
      cols.map(c => {
        const val = row[c];
        const numVal = Number(val);
        const isNum = !isNaN(numVal) && val !== null && val !== '' && typeof val !== 'boolean';
        return {
          text: isNum ? numVal.toLocaleString('id-ID') : String(val ?? '-'),
          options: {
            fontSize: 6.5, fontFace: SLIDE.FONT, color: '333333',
            fill: { color: ri % 2 === 0 ? 'FFFFFF' : 'F8FAF5' },
            align: (isNum ? 'center' : 'left') as 'center' | 'left',
            border: thinBorder('EEEEEE'),
          },
        };
      })
    );

    slide.addTable([headerRow, ...dataRows], { x, y, w, colW, rowH: 0.22 });

    const tableEndY = y + (display.length + 1) * 0.22;

    if (rows.length > maxRows) {
      slide.addText(`${maxRows}/${rows.length} baris ditampilkan`, { x, y: tableEndY, w, h: 0.15, fontSize: 6, fontFace: SLIDE.FONT, color: 'BBBBBB', italic: true, align: 'right' });
      return tableEndY + 0.15;
    }
    return tableEndY;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SLIDE 1: Title
  // ═══════════════════════════════════════════════════════════════════════
  const titleSlide = pptx.addSlide();
  slideNum++;
  titleSlide.background = { color: SLIDE.GREEN };
  titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.1, h: '100%', fill: { color: SLIDE.DARK_GREEN } });
  titleSlide.addShape(pptx.ShapeType.rect, { x: 0.1, y: 0, w: 0.025, h: '100%', fill: { color: SLIDE.ACCENT_GREEN } });
  titleSlide.addText(payload.dashboardName.toUpperCase(), {
    x: 0.9, y: 1.8, w: '80%', h: 1.0,
    fontSize: 34, fontFace: SLIDE.FONT, color: WHITE, bold: true, charSpacing: 2,
  });
  titleSlide.addText(payload.subtitle || 'Irregularity, Complain & Compliment Report', {
    x: 0.9, y: 2.9, w: '80%', h: 0.5, fontSize: 15, fontFace: SLIDE.FONT, color: 'D4E8C0', italic: true,
  });
  titleSlide.addShape(pptx.ShapeType.rect, { x: 0.9, y: 3.55, w: 3, h: 0.025, fill: { color: 'D4E8C0' } });
  titleSlide.addText(`PT Gapura Angkasa  |  ${dateStr}`, {
    x: 0.9, y: 3.8, w: '80%', h: 0.35, fontSize: 11, fontFace: SLIDE.FONT, color: 'A8C67F',
  });
  titleSlide.addText('CONFIDENTIAL — FOR INTERNAL USE ONLY', {
    x: 0.9, y: 6.8, w: '80%', h: 0.25, fontSize: 7, fontFace: SLIDE.FONT, color: '8AAD5E', charSpacing: 3,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Separate tiles into KPIs vs data charts for dashboard grouping
  // ═══════════════════════════════════════════════════════════════════════
  interface TileWithData {
    tile: TileData;
    cr: { queryResult?: QueryResult; stats?: { distribution: { name: string; count: number; percentage: number }[]; totalCount: number } };
    insight?: TileInsight;
  }

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
      divSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 3.0, w: '100%', h: 1.5, fill: { color: SLIDE.LIGHT_GREEN } });
      divSlide.addText(page.name, {
        x: 0.5, y: 3.1, w: '90%', h: 1.3, fontSize: 26, fontFace: SLIDE.FONT, color: SLIDE.GREEN, bold: true, align: 'center', valign: 'middle',
      });
      divSlide.addShape(pptx.ShapeType.rect, { x: 5.4, y: 4.65, w: 2.5, h: 0.035, fill: { color: SLIDE.GREEN } });
    }

    // ═════════════════════════════════════════════════════════════════════
    // SLIDE: KPI Overview + Executive Summary (combined dashboard slide)
    // ═════════════════════════════════════════════════════════════════════
    if (kpiTiles.length > 0 || (insights?.executiveSummary && insights.executiveSummary.length > 0)) {
      const overviewSlide = pptx.addSlide();
      addSlideChrome(overviewSlide, payload.pages.length > 1 ? `${page.name} — Overview` : 'Dashboard Overview');

      // ── KPI cards row ──────────────────────────────────────────────
      if (kpiTiles.length > 0) {
        const cardCount = Math.min(kpiTiles.length, 5);
        const totalW = 12.5;
        const gap = 0.2;
        const cardW = (totalW - (cardCount - 1) * gap) / cardCount;
        const cardH = 1.6;
        const startY = 0.75;

        kpiTiles.slice(0, 5).forEach((tw, i) => {
          const x = 0.4 + i * (cardW + gap);
          const row = (tw.cr.queryResult?.rows as Record<string, unknown>[])?.[0];
          const val = row ? (Object.values(row).find(v => typeof v === 'number') ?? Object.values(row)[0]) : '-';
          const label = tw.cr.queryResult?.columns[0] ?? tw.tile.title;

          // Card background
          overviewSlide.addShape(pptx.ShapeType.roundRect, {
            x, y: startY, w: cardW, h: cardH,
            fill: { color: 'FFFFFF' }, rectRadius: 0.08,
            line: { color: 'E2E8D8', width: 1 },
            shadow: { type: 'outer', blur: 4, offset: 1, color: '00000015' },
          });
          // Green top accent
          overviewSlide.addShape(pptx.ShapeType.rect, {
            x: x + 0.15, y: startY + 0.12, w: cardW - 0.3, h: 0.04, fill: { color: SLIDE.ACCENT_GREEN },
          });
          // Value
          overviewSlide.addText(String(val ?? '-'), {
            x, y: startY + 0.25, w: cardW, h: 0.85,
            fontSize: cardCount <= 3 ? 42 : 32, fontFace: SLIDE.FONT, color: SLIDE.GREEN, bold: true, align: 'center', valign: 'middle',
          });
          // Label
          overviewSlide.addText(formatCol(label), {
            x, y: startY + cardH - 0.4, w: cardW, h: 0.3,
            fontSize: 8, fontFace: SLIDE.FONT, color: '999999', align: 'center', valign: 'middle',
          });
        });

        // KPI insight summary (combined)
        const kpiFindings = kpiTiles.flatMap(tw => tw.insight?.keyFindings?.slice(0, 1) ?? []);
        if (kpiFindings.length > 0) {
          addMiniInsight(overviewSlide, kpiFindings, 0.4, startY + cardH + 0.15, totalW);
        }
      }

      // ── Executive summary bullets ──────────────────────────────────
      if (insights?.executiveSummary && insights.executiveSummary.length > 0) {
        const execY = kpiTiles.length > 0 ? 3.1 : 0.85;
        overviewSlide.addShape(pptx.ShapeType.rect, { x: 0.4, y: execY - 0.05, w: 12.5, h: 0.28, fill: { color: 'F7F9F4' } });
        overviewSlide.addShape(pptx.ShapeType.rect, { x: 0.4, y: execY - 0.05, w: 0.04, h: 0.28, fill: { color: SLIDE.GREEN } });
        overviewSlide.addText('Executive Summary', {
          x: 0.55, y: execY - 0.05, w: 4, h: 0.28, fontSize: 9, fontFace: SLIDE.FONT, color: '444444', bold: true, valign: 'middle',
        });

        insights.executiveSummary.slice(0, 5).forEach((point, i) => {
          const bulletY = execY + 0.3 + i * 0.55;
          // Number badge
          overviewSlide.addShape(pptx.ShapeType.ellipse, {
            x: 0.5, y: bulletY + 0.03, w: 0.22, h: 0.22, fill: { color: SLIDE.GREEN },
          });
          overviewSlide.addText(String(i + 1), {
            x: 0.5, y: bulletY + 0.03, w: 0.22, h: 0.22, fontSize: 8, fontFace: SLIDE.FONT, color: WHITE, bold: true, align: 'center', valign: 'middle',
          });
          overviewSlide.addText(point, {
            x: 0.85, y: bulletY, w: 11.9, h: 0.28, fontSize: 10, fontFace: SLIDE.FONT, color: '333333', valign: 'middle',
          });
        });
      }
    }

    // ═════════════════════════════════════════════════════════════════════
    // DASHBOARD SLIDES: Data tiles grouped 2-per-slide (side by side)
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
      const contentY = 0.7;
      const maxTableRows = isSingle ? 16 : 10;

      pair.forEach((tw, pi) => {
        const xBase = isSingle ? 0.4 : (pi === 0 ? 0.4 : 0.4 + panelW + panelGap);

        // Panel header
        addPanelHeader(dashSlide, tw.tile.title, xBase, contentY, panelW);

        let yEnd = contentY + 0.35;

        // Render data
        if (tw.cr.queryResult && tw.cr.queryResult.rows.length > 0) {
          const cols = tw.cr.queryResult.columns;
          const rows = tw.cr.queryResult.rows as Record<string, unknown>[];
          const displayCols = cols.slice(0, isSingle ? 8 : 5);
          yEnd = addCompactTable(dashSlide, displayCols, rows, xBase, yEnd, panelW, maxTableRows);
        } else if (tw.cr.stats) {
          const distRows = tw.cr.stats.distribution.map(item => ({
            nama: item.name,
            jumlah: item.count,
            persen: `${item.percentage}%`,
          }));
          yEnd = addCompactTable(
            dashSlide,
            ['nama', 'jumlah', 'persen'],
            distRows as unknown as Record<string, unknown>[],
            xBase, yEnd, panelW, maxTableRows,
          );
        }

        // Mini insight box below the table
        if (tw.insight?.keyFindings && tw.insight.keyFindings.length > 0) {
          addMiniInsight(dashSlide, tw.insight.keyFindings, xBase, yEnd + 0.08, panelW);
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

    insights.recommendations.forEach((rec, i) => {
      const yPos = 0.85 + i * 0.75;
      recSlide.addShape(pptx.ShapeType.rect, {
        x: 0.5, y: yPos + 0.05, w: 0.22, h: 0.22,
        fill: { color: SLIDE.GREEN }, rectRadius: 0.04,
      });
      recSlide.addText('→', {
        x: 0.5, y: yPos + 0.05, w: 0.22, h: 0.22,
        fontSize: 10, fontFace: SLIDE.FONT, color: WHITE, align: 'center', valign: 'middle',
      });
      recSlide.addText(rec, {
        x: 0.85, y: yPos, w: 11.8, h: 0.32,
        fontSize: 11, fontFace: SLIDE.FONT, color: '333333', valign: 'middle',
      });
    });

    if (insights.closingStatement) {
      const closingY = 0.85 + insights.recommendations.length * 0.75 + 0.4;
      recSlide.addShape(pptx.ShapeType.rect, {
        x: 0.4, y: closingY, w: 12.5, h: 0.55,
        fill: { color: SLIDE.LIGHT_GREEN }, rectRadius: 0.04,
      });
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
  endSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.1, h: '100%', fill: { color: SLIDE.DARK_GREEN } });
  endSlide.addText('TERIMA KASIH', {
    x: 0.9, y: 2.5, w: '80%', h: 0.9,
    fontSize: 38, fontFace: SLIDE.FONT, color: WHITE, bold: true, charSpacing: 5,
  });
  endSlide.addShape(pptx.ShapeType.rect, { x: 0.9, y: 3.55, w: 3, h: 0.025, fill: { color: 'D4E8C0' } });
  endSlide.addText(`PT Gapura Angkasa  |  ${dateStr}`, {
    x: 0.9, y: 3.8, w: '80%', h: 0.35, fontSize: 11, fontFace: SLIDE.FONT, color: 'A8C67F',
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
