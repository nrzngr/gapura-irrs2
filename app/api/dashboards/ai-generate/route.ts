import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { OpenRouter } from '@openrouter/sdk';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { TABLES, JOINS, isValidTable, isValidField, getJoinDef } from '@/lib/builder/schema';
import { validateQuery } from '@/lib/builder/sql-builder';
import type { DashboardDefinition, DashboardTile } from '@/types/builder';

function buildSchemaContext(): string {
  const tableDescriptions = TABLES.map(t => {
    const fields = t.fields.map(f => {
      let desc = `    - ${f.name} (${f.type}, label: "${f.label}")`;
      if (f.enumValues && f.enumValues.length > 0) {
        desc += ` — enum: [${f.enumValues.map(v => `"${v}"`).join(', ')}]`;
      }
      return desc;
    }).join('\n');
    return `  Table: "${t.name}" (label: "${t.label}")\n  Fields:\n${fields}`;
  }).join('\n\n');

  const joinDescriptions = JOINS.map(j =>
    `  - key: "${j.key}" — ${j.from}.${j.fromField} → ${j.to}.${j.toField} (label: "${j.label}")`
  ).join('\n');

  return `DATABASE SCHEMA:\n\n${tableDescriptions}\n\nAVAILABLE JOINS:\n${joinDescriptions}`;
}

/** Query real DB to get actual distinct values and distributions */
async function buildDataContext(): Promise<string> {
  try {
    const { data: summaryData } = await supabaseAdmin.rpc('run_analytics_query', {
      query_text: `SELECT
        COUNT(*) as total_reports,
        MIN(created_at)::text as earliest_date,
        MAX(created_at)::text as latest_date
      FROM reports`,
      query_params: [],
    });

    const { data: distData } = await supabaseAdmin.rpc('run_analytics_query', {
      query_text: `
        SELECT 'main_category' as field, main_category as value, COUNT(*)::int as cnt FROM reports GROUP BY main_category
        UNION ALL SELECT 'sub_category', sub_category, COUNT(*)::int FROM reports GROUP BY sub_category
        UNION ALL SELECT 'area', area, COUNT(*)::int FROM reports GROUP BY area
        UNION ALL SELECT 'target_division', target_division, COUNT(*)::int FROM reports GROUP BY target_division
        UNION ALL SELECT 'severity', severity, COUNT(*)::int FROM reports GROUP BY severity
        UNION ALL SELECT 'status', status, COUNT(*)::int FROM reports GROUP BY status
        UNION ALL SELECT 'hub', hub, COUNT(*)::int FROM reports WHERE hub IS NOT NULL GROUP BY hub
        UNION ALL SELECT 'airline_type', airline_type, COUNT(*)::int FROM reports WHERE airline_type IS NOT NULL GROUP BY airline_type
        UNION ALL SELECT 'airline', airline, COUNT(*)::int FROM reports WHERE airline IS NOT NULL GROUP BY airline
        UNION ALL SELECT 'branch', branch, COUNT(*)::int FROM reports WHERE branch IS NOT NULL GROUP BY branch
        ORDER BY field, cnt DESC
      `,
      query_params: [],
    });

    const summary = Array.isArray(summaryData) && summaryData[0] ? summaryData[0] : {};
    const distributions = Array.isArray(distData) ? distData : [];

    // Group distributions by field
    const grouped: Record<string, { value: string; cnt: number }[]> = {};
    for (const row of distributions) {
      const f = String(row.field);
      if (!grouped[f]) grouped[f] = [];
      grouped[f].push({ value: String(row.value), cnt: Number(row.cnt) });
    }

    let context = `\nDATA AKTUAL DARI DATABASE (gunakan ini untuk akurasi):\n`;
    context += `- Total laporan: ${summary.total_reports || 0}\n`;
    context += `- Rentang tanggal: ${summary.earliest_date || '?'} s/d ${summary.latest_date || '?'}\n\n`;

    for (const [field, values] of Object.entries(grouped)) {
      context += `Field "${field}" — distribusi aktual:\n`;
      for (const v of values) {
        context += `  "${v.value}": ${v.cnt} laporan\n`;
      }
      context += '\n';
    }

    return context;
  } catch (err) {
    console.error('Failed to build data context:', err);
    return '\n(Gagal mengambil data konteks dari database)\n';
  }
}

function buildSystemPrompt(dataContext: string): string {
  return `Kamu adalah AI assistant yang membuat DashboardDefinition JSON MULTI-HALAMAN untuk sistem IRRS (Irregularity Report System) di bandara.

${buildSchemaContext()}

${dataContext}

OUTPUT FORMAT — kembalikan JSON valid:

{
  "name": "string — Judul dashboard Bahasa Indonesia",
  "description": "string — Deskripsi singkat",
  "pages": [
    {
      "name": "Nama Halaman",
      "tiles": [DashboardTile, ...]
    },
    ...
  ]
}

DashboardTile:
{
  "id": "tile-1",
  "query": QueryDefinition,
  "visualization": ChartVisualization,
  "layout": TileLayout
}

QueryDefinition:
{
  "source": "reports",
  "joins": [{ "from": "reports", "to": "users", "joinKey": "reports_users" }],
  "dimensions": [{ "table": "reports", "field": "status", "alias": "Status", "dateGranularity": "month" }],
  "measures": [{ "table": "reports", "field": "id", "function": "COUNT", "alias": "Jumlah" }],
  "filters": [{ "table": "reports", "field": "main_category", "operator": "eq", "value": "Compliment", "conjunction": "AND" }],
  "sorts": [{ "field": "Jumlah", "direction": "desc", "alias": "Jumlah" }],
  "limit": 1000
}

PENTING — ATURAN ALIAS:
- Alias dimensi dan measure HARUS human-readable dalam Bahasa Indonesia
- Contoh alias dimensi: "Status", "Divisi", "Stasiun", "Maskapai", "Area", "Bulan", "Minggu", "Tanggal", "Kategori", "Sub Kategori", "Severity"
- Contoh alias measure: "Jumlah", "Jumlah Laporan", "Total", "Rata-rata"
- JANGAN gunakan format teknis seperti "count_id", "reports_status", "COUNT_id"
- Alias measure HARUS cocok dengan sort alias dan yAxis
- Alias dimensi HARUS cocok dengan xAxis

ChartVisualization:
{
  "chartType": "bar|horizontal_bar|line|area|pie|donut|kpi|table|heatmap",
  "xAxis": "Status",
  "yAxis": ["Jumlah"],
  "title": "Judul Chart — Bahasa Indonesia, deskriptif",
  "showLegend": true,
  "showLabels": true,
  "colors": ["#7cb342","#558b2f","#aed581","#33691e","#9ccc65","#689f38","#c5e1a5","#43a047"]
}

TileLayout (grid 12 kolom):
{
  "x": 0, "y": 0, "w": 6, "h": 2
}

ATURAN MULTI-PAGE DASHBOARD:
1. Buat 4-6 HALAMAN (pages) yang masing-masing fokus pada analisis berbeda
2. Setiap halaman HARUS memiliki 4-6 tiles
3. Total tiles keseluruhan: 20-30 tiles
4. Nama halaman HARUS deskriptif, contoh:
   - "Ringkasan Umum" (overview — KPI + chart utama)
   - "Analisis Kategori" (breakdown per main_category, sub_category)
   - "Analisis per Area & Divisi" (breakdown per area, target_division)
   - "Analisis Maskapai" (breakdown per airline, airline_type)
   - "Trend Waktu" (trend per bulan/minggu — gunakan created_at + dateGranularity)
   - "Analisis per Branch/Hub" (breakdown per branch, hub)
   - "Detail Laporan & Evidence" (chartType: "table" — detail laporan + evidence links)
5. Halaman pertama SELALU "Ringkasan Umum" berisi KPI cards + chart overview

ATURAN DASHBOARD DESIGN:
1. Halaman pertama: 3 KPI cards (w:4, h:1) + 2-3 chart overview
2. Halaman berikutnya: campuran chart types yang relevan dengan tema halaman
3. Buat variasi chart types per halaman: bar, pie/donut, line/area, horizontal_bar
4. SELALU gunakan palet warna HIJAU untuk semua tiles (branding Gapura): "#7cb342","#558b2f","#aed581","#33691e","#9ccc65","#689f38","#c5e1a5","#43a047"
5. KPI: measures saja tanpa dimensions, yAxis = alias measure
6. Bar chart: 1 dimensi kategori + 1 measure
7. Line/area: 1 dimensi waktu (dateGranularity) + 1 measure, w:12
8. Pie/donut: 1 dimensi kategori + 1 measure, showLabels:true. xAxis HARUS SAMA PERSIS dengan alias dimensi. Contoh: dimensi alias "Status" → xAxis: "Status"
9. Horizontal_bar: cocok jika label dimensi panjang (sub_category, airline)
10. Table: chartType "table" untuk menampilkan data tabular detail. Gunakan untuk evidence list, detail laporan, dsb. xAxis dan yAxis boleh kosong/sesuaikan. w:12, h:2
11. Heatmap: HARUS memiliki TEPAT 2 dimensions (row × col) + 1 measure. w:12, h:3. Cocok untuk: area × severity, bulan × kategori. xAxis = alias dim pertama, yAxis = [alias measure]. Contoh: dimensions [{"area"}, {"severity"}], measures [{"COUNT id"}]

ATURAN FILTER — KRITIS:
- SETIAP filter HARUS memiliki "value" yang TIDAK NULL dan TIDAK kosong (""), KECUALI operator "is_null" atau "is_not_null"
- operator "eq", "neq", "gt", "gte", "lt", "lte": value HARUS string/number yang valid
- operator "in", "not_in": value HARUS array non-kosong
- operator "between": value HARUS array dengan TEPAT 2 elemen
- JANGAN buat filter tanpa value — ini menyebabkan error SQL

ATURAN FIELD — SANGAT PENTING:
- JANGAN gunakan field "location" karena data SANGAT JARANG terisi (hampir semua NULL). Gunakan "station_code", "branch", atau "hub" untuk analisis lokasi
- JANGAN gunakan field "specific_location" (jarang terisi)
- Untuk trend waktu, gunakan "created_at" (datetime) dengan dateGranularity "month" atau "week". JANGAN gunakan "incident_date" (type date, tidak support dateGranularity)
- Untuk tabel evidence: gunakan dimensions "title", "description", "evidence_urls", "status", "severity" dari tabel "reports"

ATURAN TABLE CHART TYPE:
- Gunakan chartType "table" untuk halaman yang menampilkan daftar laporan detail
- Sertakan di halaman terakhir: "Detail Laporan & Evidence" — tabel dengan kolom: title (Judul), description (Deskripsi), evidence_urls (Link Evidence), status (Status), severity (Severity), created_at (Tanggal)
- Table tiles: query tanpa measures (hanya dimensions), limit 50, w:12, h:2
- yAxis: [] (kosong), xAxis: "" (kosong)

ATURAN QUERY — SANGAT PENTING:
1. HANYA gunakan table name dan field name dari schema
2. Hitung jumlah: COUNT pada "id" dengan alias "Jumlah" / "Total"
3. Field datetime (created_at, updated_at, resolved_at, dll): SELALU pakai dateGranularity ("month", "week", "day")
4. Filter tanggal: operator "gte"/"lte", format "YYYY-MM-DD", field "created_at" (datetime, bukan date)
5. Filter enum: nilai PERSIS dari DATA AKTUAL di atas (case-sensitive) — JANGAN mengarang nilai
6. Sort: gunakan alias measure, direction "desc"
7. conjunction "AND" pada semua filter
8. GUNAKAN DATA AKTUAL untuk memastikan nilai filter, dimensi, dan measure AKURAT
9. JANGAN hallusinasi — semua field name, table name, enum values HARUS dari schema
10. JANGAN gunakan "incident_date" untuk trend — gunakan "created_at" dengan dateGranularity
11. Untuk table chartType: gunakan dimensions saja (tanpa measures), limit 50

MAPPING KATA KUNCI USER:
- "compliment" → main_category = "Compliment"
- "complaint"/"keluhan" → main_category = "Complaint"
- "irregularity"/"insiden" → main_category = "Irregularity"
- "januari"→01, "februari"→02, "maret"→03, "april"→04, "mei"→05, "juni"→06
- "juli"→07, "agustus"→08, "september"→09, "oktober"→10, "november"→11, "desember"→12

CONTOH LAYOUT PER HALAMAN:
Halaman "Ringkasan Umum":
Row 0: [KPI w:4 h:1] [KPI w:4 h:1] [KPI w:4 h:1]
Row 1: [Bar w:6 h:2] [Donut w:6 h:2]
Row 3: [Line w:12 h:2]

Halaman "Analisis Kategori":
Row 0: [Bar w:6 h:2] [Donut w:6 h:2]
Row 2: [Horizontal Bar w:12 h:2]
Row 4: [Bar w:6 h:2] [Pie w:6 h:2]

CONTOH — prompt: "dashboard lengkap semua data"
Pages:
1. "Ringkasan Umum": KPI Total, KPI Irregularity, KPI Complaint, Bar per Kategori, Donut per Status, Line Trend Bulanan (created_at, dateGranularity:"month")
2. "Detail Kategori": Bar Sub Kategori, Horizontal Bar Sub Kategori per Kategori, Donut per Kategori, Bar per Severity
3. "Analisis Area & Divisi": Bar per Area, Donut per Divisi, Horizontal Bar Sub Kategori per Divisi, Bar Severity per Area
4. "Analisis Maskapai": Horizontal Bar Top Maskapai, Donut Lokal vs MPA, Bar per Maskapai dan Kategori
5. "Trend & Waktu": Line Trend Bulanan (created_at, dateGranularity:"month"), Area Trend Mingguan (created_at, dateGranularity:"week"), Bar per Hub
6. "Analisis per Hub/Branch": Bar per Hub, Horizontal Bar per Branch, Donut per Hub, Bar Branch vs Kategori
7. "Detail Laporan & Evidence": Table (chartType:"table") — dimensions: title, description, evidence_urls, status, severity, created_at. Limit 50. w:12

PENTING — ANALISIS KRUSIAL YANG WAJIB ADA:
- KPI: Total Laporan, Total Irregularity, Total Complaint, Total Compliment
- SLA compliance: Laporan SELESAI vs belum
- Severity distribution: high/medium/low breakdown
- Top maskapai bermasalah (filter Irregularity, group by airline)
- Trend waktu: apakah naik/turun per bulan
- Division workload: distribusi per target_division
- Detail evidence: tabel dengan link evidence untuk setiap laporan

Jawab HANYA dengan JSON, tanpa markdown backtick atau penjelasan.`;
}

// Green color palettes matching Gapura branding
const TILE_PALETTES = [
  ['#7cb342', '#9ccc65', '#c5e1a5'], // light green
  ['#558b2f', '#689f38', '#8bc34a'], // green
  ['#33691e', '#558b2f', '#7cb342'], // dark green
  ['#43a047', '#66bb6a', '#a5d6a7'], // medium green
  ['#2e7d32', '#4caf50', '#81c784'], // emerald green
  ['#aed581', '#c5e1a5', '#dcedc8'], // pale green
  ['#689f38', '#7cb342', '#9ccc65'], // olive green
  ['#388e3c', '#4caf50', '#66bb6a'], // forest green
];

function postProcessDashboard(def: DashboardDefinition): DashboardDefinition {
  // Process tiles within pages
  if (def.pages && def.pages.length > 0) {
    let globalIdx = 0;
    def.pages = def.pages.map(page => {
      page.tiles = page.tiles.map(tile => {
        tile = processTile(tile, globalIdx);
        globalIdx++;
        return tile;
      });
      return page;
    });
    // Flatten pages into tiles for backwards compat
    def.tiles = def.pages.flatMap(p => p.tiles);
  } else if (def.tiles && def.tiles.length > 0) {
    // Legacy: single page
    def.tiles = def.tiles.map((tile, idx) => processTile(tile, idx));
    def.pages = [{ name: 'Ringkasan Umum', tiles: def.tiles }];
  }

  return def;
}

function processTile(tile: DashboardTile, idx: number): DashboardTile {
  tile.id = `tile-${Date.now()}-${idx + 1}`;

  if (!tile.visualization.colors || tile.visualization.colors.length === 0) {
    tile.visualization.colors = TILE_PALETTES[idx % TILE_PALETTES.length];
  }

  // Fix pie/donut: ensure xAxis matches dimension alias, enable labels
  if (tile.visualization.chartType === 'pie' || tile.visualization.chartType === 'donut') {
    tile.visualization.showLabels = true;
    // If xAxis is missing or doesn't match a dimension alias, fix it
    if (tile.query.dimensions.length > 0) {
      const dimAlias = tile.query.dimensions[0].alias;
      if (!tile.visualization.xAxis || tile.visualization.xAxis !== dimAlias) {
        tile.visualization.xAxis = dimAlias || tile.query.dimensions[0].field;
      }
    }
  }

  // Fix bar/horizontal_bar/line/area: ensure xAxis matches dimension alias
  if (['bar', 'horizontal_bar', 'line', 'area'].includes(tile.visualization.chartType)) {
    if (tile.query.dimensions.length > 0) {
      const dimAlias = tile.query.dimensions[0].alias;
      if (!tile.visualization.xAxis && dimAlias) {
        tile.visualization.xAxis = dimAlias;
      }
    }
  }

  // Fix yAxis: ensure it matches measure alias
  if (tile.query.measures.length > 0 && (!tile.visualization.yAxis || tile.visualization.yAxis.length === 0)) {
    tile.visualization.yAxis = tile.query.measures.map(m => m.alias || m.field);
  }

  if (tile.query.sorts.length === 0 && tile.query.measures.length > 0) {
    const m = tile.query.measures[0];
    tile.query.sorts = [{
      field: m.alias || `${m.function.toLowerCase()}_${m.table}_${m.field}`,
      direction: 'desc',
      alias: m.alias || `${m.function.toLowerCase()}_${m.table}_${m.field}`,
    }];
  }

  if (tile.visualization.chartType === 'kpi') {
    tile.layout.h = 1;
  }

  // Table type: ensure proper defaults
  if (tile.visualization.chartType === 'table') {
    tile.layout.w = 12;
    if (!tile.query.limit || tile.query.limit > 100) tile.query.limit = 50;
  }

  if (!tile.query.limit) tile.query.limit = 1000;
  if (!tile.query.joins) tile.query.joins = [];
  if (!tile.query.dimensions) tile.query.dimensions = [];
  if (!tile.query.measures) tile.query.measures = [];
  if (!tile.query.sorts) tile.query.sorts = [];

  const VALID_OPERATORS = new Set(['eq','neq','gt','gte','lt','lte','like','in','not_in','between','is_null','is_not_null']);
  tile.query.filters = (tile.query.filters || [])
    .filter(f => {
      if (!VALID_OPERATORS.has(f.operator)) return false;
      if (f.operator === 'is_null' || f.operator === 'is_not_null') return true;
      if (f.value === null || f.value === undefined) return false;
      if (typeof f.value === 'string' && f.value.trim() === '') return false;
      if (Array.isArray(f.value) && f.value.length === 0) return false;
      if (f.operator === 'between' && (!Array.isArray(f.value) || f.value.length < 2)) return false;
      return true;
    })
    .map(f => ({
      ...f,
      conjunction: f.conjunction || 'AND',
    }));

  // Replace "location" field usage with "station_code" (location is mostly NULL)
  for (const dim of tile.query.dimensions) {
    if (dim.table === 'reports' && dim.field === 'location') {
      dim.field = 'station_code';
      dim.alias = dim.alias?.replace(/lokasi/i, 'Stasiun') || 'Stasiun';
    }
  }

  return tile;
}

function validateDashboardDefinition(def: DashboardDefinition): string[] {
  const errors: string[] = [];

  if (!def.name || typeof def.name !== 'string') {
    errors.push('Dashboard harus memiliki nama');
  }

  const allTiles = def.pages
    ? def.pages.flatMap(p => p.tiles)
    : def.tiles || [];

  if (allTiles.length === 0) {
    errors.push('Dashboard harus memiliki minimal 1 tile');
  }

  for (let i = 0; i < allTiles.length; i++) {
    const tile = allTiles[i];

    if (!tile.query || !tile.visualization || !tile.layout) {
      errors.push(`Tile ${i + 1}: struktur tidak lengkap`);
      continue;
    }

    if (!isValidTable(tile.query.source)) {
      errors.push(`Tile ${i + 1}: tabel "${tile.query.source}" tidak valid`);
      continue;
    }

    for (const join of tile.query.joins) {
      const joinDef = getJoinDef(join.joinKey);
      if (!joinDef) {
        errors.push(`Tile ${i + 1}: join "${join.joinKey}" tidak ditemukan`);
      }
    }

    for (const dim of tile.query.dimensions) {
      if (!isValidField(dim.table, dim.field)) {
        errors.push(`Tile ${i + 1}: field dimensi "${dim.table}.${dim.field}" tidak valid`);
      }
    }

    for (const m of tile.query.measures) {
      if (!isValidField(m.table, m.field)) {
        errors.push(`Tile ${i + 1}: field ukuran "${m.table}.${m.field}" tidak valid`);
      }
    }

    for (const f of tile.query.filters) {
      if (!isValidField(f.table, f.field)) {
        errors.push(`Tile ${i + 1}: field filter "${f.table}.${f.field}" tidak valid`);
      }
    }

    const queryErrors = validateQuery(tile.query);
    if (queryErrors.length > 0) {
      errors.push(`Tile ${i + 1}: ${queryErrors.join('; ')}`);
    }
  }

  return errors;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySession(session);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = String(payload.role).trim().toUpperCase();
    if (role !== 'ANALYST' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: hanya Analyst dan Admin' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt diperlukan' }, { status: 400 });
    }

    if (prompt.length > 2000) {
      return NextResponse.json({ error: 'Prompt terlalu panjang (maks 2000 karakter)' }, { status: 400 });
    }

    // Build data context from real database
    const dataContext = await buildDataContext();

    // Build system prompt with real data
    const systemPrompt = buildSystemPrompt(dataContext);

    // Call OpenRouter
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key belum dikonfigurasi' }, { status: 500 });
    }

    const openrouter = new OpenRouter({ apiKey });
    let content;

    try {
      const completion: any = await openrouter.chat.send({
        httpReferer: 'https://gapura.id',
        xTitle: 'Gapura Dashboard',
        chatGenerationParams: {
          model: "arcee-ai/trinity-large-preview:free",
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          maxTokens: 16384,
          stream: false,
          provider: {
            dataCollection: "allow"
          }
        }
      });
      
      content = completion.choices?.[0]?.message?.content;
    } catch (error: any) {
       console.error('OpenRouter API error:', error);
       return NextResponse.json(
        { error: 'Gagal menghubungi AI. Coba lagi nanti.' },
        { status: 502 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: 'AI tidak mengembalikan respons' },
        { status: 502 }
      );
    }

    // Clean <think> tags from reasoning models
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Parse AI response
    let dashboard: DashboardDefinition;
    try {
      // Try extracting JSON if wrapped in markdown
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
         content = jsonMatch[1];
      }
      dashboard = JSON.parse(content) as DashboardDefinition;
    } catch {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        { error: 'AI mengembalikan format yang tidak valid. Coba ubah prompt.' },
        { status: 422 }
      );
    }

    // Post-process: fix IDs, colors, defaults, create pages
    dashboard = postProcessDashboard(dashboard);

    // Validate against schema
    const validationErrors = validateDashboardDefinition(dashboard);
    if (validationErrors.length > 0) {
      console.error('AI dashboard validation errors:', validationErrors);
      return NextResponse.json(
        { error: 'Dashboard yang dihasilkan AI tidak valid', details: validationErrors },
        { status: 422 }
      );
    }

    return NextResponse.json({ dashboard });
  } catch (err) {
    console.error('AI generate error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
