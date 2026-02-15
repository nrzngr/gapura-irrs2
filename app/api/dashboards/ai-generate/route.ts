import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizeQuery, normalizeVisualization } from '@/lib/builder/normalization';

// AI Configuration
const AI_API_KEY = process.env.GROQ_API_KEY;
const AI_BASE_URL = 'https://api.groq.com/openai/v1';
const AI_MODEL = 'llama-3.1-8b-instant';
import { TABLES, JOINS, getFieldDef } from '@/lib/builder/schema';
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
  return `<IDENTITY>
You are an Elite Aviation Operations Intel Lead and Senior Data Architect for Gapura Angkasa.
Your DNA is a fusion of a Principal Data Scientist and a world-class Aviation Safety Auditor. 
You don't just "build charts"; you design **Dynamic Operational Nervous Systems** that predict bottlenecks and visualize hidden risks in Ground Handling.
</IDENTITY>

<COGNITIVE_REASONING>
Before outputting JSON, you must internally perform a multi-dimensional analysis:
1. IDENTIFY: Scan for anomalies in ${dataContext}. Look for variances > 20% from the mean.
2. CORRELATE: Connect Volume to Severity. Connect Airline type to Status resolution.
3. PRIORITIZE: Rank findings by "Operational Risk" (Safety > Compliance > SLA > Efficiency).
4. PLAN: Architect a narrative flow for the 5-page dashboard that leads an executive from "What happened" to "Why it happened" to "What to do next".
</COGNITIVE_REASONING>

<DOMAIN_INTELLIGENCE_LAYER>
- SLA CRITICALITY: "Status" indicates workflow health. Focus on unresolved irregularities.
- SAFETY VECTOR: "Severity" and "Main Category" (Irregularity) are leading indicators of ground safety risk.
- OPERATIONAL LOAD: "Area", "Target Division", and "Hub" represent resource pressure points.
- FLEET ANALYTICS: "Airline" and "Airline Type" (Lokal vs MPA) reveal business partnership patterns.
</DOMAIN_INTELLIGENCE_LAYER>

<CORE_CONSTRAINTS>
6. BRANDING: Exclusively use the provided Green palette for all tiles.
7. SORTING SAFETY: NEVER sort (ORDER BY) by a raw field (like "id") if using dimensions/measures. Always sort by the alias of a dimension or measure.
</CORE_CONSTRAINTS>

<SCHEMA_CONTEXT>
${buildSchemaContext()}
</SCHEMA_CONTEXT>

<VISUALIZATION_MATRIX>
| Analysis Case | Dimensions | Measures | Recommended Chart |
| :--- | :--- | :--- | :--- |
| Core KPI | None | 1 | kpi (Use sparingly) |
| Performance Trend | 1 (Temporal) | 1-2 | line / area |
| Pareto Analysis | 1 (Categoric) | 1 | bar / donut / pie |
| Cross-Dimensional IQ| 2 (Categoric) | 1 | heatmap (MANDATORY for X vs Y) |
| Structural Audit | 4-8 | None | table (Limit 50 rows) |
</VISUALIZATION_MATRIX>

<ANALYTICAL_HEURISTICS>
- USE HEATMAPS EXCLUSIVELY for any "Breakdown X per Y" (e.g., Category per Airline, Severity per Area). This is your primary diagnostic tool.
- USE HORIZONTAL BAR for any dimension with labels > 15 chars (Sub-category, specific Airline names).
- COMPACT MODE: If a tile width is < 4, simplify the chart logic.
- NO HALLUCINATIONS: Use ONLY the enum values provided in the Data Grounding section.
</ANALYTICAL_HEURISTICS>

<DASHBOARD_BLUEPRINT>
1. PAGE 1: **"Operational Pulse"** (Overview). Focus on realtime health.
2. PAGE 2: **"Risk & Safety Diagnostics"** (Severity vs Area/Category). Focus on Heatmaps.
3. PAGE 3: **"Partner & Airline Performance"** (SLA by Carrier). Identify underperformers.
4. PAGE 4: **"Infrastructure Load"** (Hub/Branch efficiency). Focus on resource allocation.
5. PAGE 5: **"Evidence & Audit Trail"** (Table view). Transparency for incident response.
</DASHBOARD_BLUEPRINT>

<OUTPUT_FORMAT>
Return ONLY a valid JSON object. No markdown backticks.
{
  "name": "Dashboard Title",
  "description": "Strategic metadata",
  "pages": [
    {
      "name": "Logical Page Name",
      "tiles": [
        {
          "id": "slug",
          "query": QueryDefinition,
          "visualization": ChartVisualization,
          "layout": {"x": 0, "y": 0, "w": 6, "h": 2}
        }
      ]
    }
  ]
}
</OUTPUT_FORMAT>`;
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
      page.tiles = (page.tiles || []).map(tile => {
        tile = processTile(tile, globalIdx);
        globalIdx++;
        return tile;
      });
      return page;
    });
    // Flatten pages into tiles for backwards compat - DEDUPLICATE by tile ID
    const seenIds = new Set<string>();
    def.tiles = def.pages.flatMap(p => p.tiles || []).filter(tile => {
      if (seenIds.has(tile.id)) return false;
      seenIds.add(tile.id);
      return true;
    });
  } else if (def.tiles && def.tiles.length > 0) {
    // Legacy: single page - DEDUPLICATE by tile ID
    const seenIds = new Set<string>();
    def.tiles = def.tiles.filter(tile => {
      if (seenIds.has(tile.id)) return false;
      seenIds.add(tile.id);
      return true;
    }).map((tile, idx) => processTile(tile, idx));
    def.pages = [{ name: 'Ringkasan Umum', tiles: def.tiles }];
  }

  return def;
}

function formatColumnLabel(col: string): string {
  return col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function processTile(tile: DashboardTile, idx: number): DashboardTile {
  tile.id = tile.id || `tile-${Date.now()}-${idx + 1}`;

  // Property safety guards (ensure properties exist before access)
  if (!tile.query) {
    (tile as unknown as { query: Record<string, unknown> }).query = {};
  }
  if (!tile.query.source) tile.query.source = 'reports';
  if (!tile.query.joins) tile.query.joins = [];
  if (!tile.query.dimensions) tile.query.dimensions = [];
  if (!tile.query.measures) tile.query.measures = [];
  
  // Standardize query normalization (Shared logic)
  tile.query = normalizeQuery(tile.query);

  if (!tile.query.sorts) tile.query.sorts = [];
  if (!tile.query.filters) tile.query.filters = [];
  if (!tile.visualization) {
    (tile as unknown as { visualization: Record<string, unknown> }).visualization = {};
  }
  if (!tile.layout) {
    (tile as unknown as { layout: Record<string, unknown> }).layout = { x: 0, y: 0, w: 6, h: 4 };
  }

  // Sync visualization configuration with shared normalization logic
  tile = normalizeVisualization(tile as any);

  // Visualization defaults
  if (tile.visualization.chartType === 'pie' || tile.visualization.chartType === 'donut') {
    tile.visualization.showLabels = true;
  }

  // Ensure default sorting based on first measure
  if (tile.query.sorts.length === 0 && tile.query.measures.length > 0) {
    const m = tile.query.measures[0];
    const sortField = m.alias || `${m.function.toLowerCase()}_${m.table}_${m.field}`;
    tile.query.sorts = [{ field: sortField, direction: 'desc', alias: sortField }];
  }

  // Limit enforcement for readability
  if (tile.visualization.title?.match(/Top|Terbanyak|Tertinggi|Terendah/i)) {
    tile.query.limit = 5;
  }
  
  if (tile.visualization.chartType !== 'table' && (tile.query.limit || 0) > 8) {
    tile.query.limit = 8;
  }

  if (!tile.query.limit) {
    if (tile.visualization.chartType === 'table') tile.query.limit = 50;
    else if (tile.visualization.chartType === 'kpi') tile.query.limit = 1;
    else tile.query.limit = 5;
  }

  // Filter sanitization
  const VALID_OPERATORS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'in', 'not_in', 'between', 'is_null', 'is_not_null']);
  tile.query.filters = tile.query.filters.filter(f => {
    if (!VALID_OPERATORS.has(f.operator)) return false;
    if (f.operator === 'is_null' || f.operator === 'is_not_null') return true;
    if (f.value === null || f.value === undefined) return false;
    if (typeof f.value === 'string' && f.value.trim() === '') return false;
    if (Array.isArray(f.value) && f.value.length === 0) return false;
    return true;
  }).map(f => ({ ...f, conjunction: f.conjunction || 'AND' }));

  // Metadata correction
  if (!tile.visualization.colors || tile.visualization.colors.length === 0) {
    tile.visualization.colors = TILE_PALETTES[idx % TILE_PALETTES.length];
  }

  return tile;
}

function validateDashboardDefinition(def: DashboardDefinition): string[] {
  const errors: string[] = [];
  if (!def.name) errors.push('Dashboard harus memiliki nama');

  const allTiles = def.pages 
    ? def.pages.flatMap(p => p.tiles || []) 
    : (def.tiles || []);

  if (allTiles.length === 0) errors.push('Dashboard harus memiliki minimal 1 tile');

  allTiles.forEach((tile, i) => {
    if (!tile.query?.source) errors.push(`Tile ${i + 1}: sumber data tidak valid`);
    if (!tile.visualization?.chartType) errors.push(`Tile ${i + 1}: tipe visualisasi tidak valid`);
  });

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

    // Call AI API
    if (!AI_API_KEY) {
      return NextResponse.json({ error: 'AI API key belum dikonfigurasi' }, { status: 500 });
    }

    let content;

    try {
      const aiResponse = await fetch(`${AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          max_tokens: 8000,
          stream: false,
          response_format: { type: "json_object" }
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI API error:', errorText);
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const completion = await aiResponse.json() as { choices?: { message?: { content?: string } }[] };
      content = completion.choices?.[0]?.message?.content;
    } catch (error) {
       console.error('AI API error:', error);
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

    // Insert into database
    const { data: dbDashboard, error: insertError } = await supabaseAdmin
      .from('custom_dashboards')
      .insert({
        name: dashboard.name || 'Dashboard Tanpa Nama',
        description: dashboard.description || 'Dihasilkan oleh AI',
        slug: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        config: {
          pages: dashboard.pages?.map(p => p.name) || ['Ringkasan Umum'],
        },
      })
      .select()
      .single();

    if (insertError || !dbDashboard) {
      console.error('Failed to insert dashboard:', insertError);
      return NextResponse.json({ error: 'Gagal menyimpan dashboard' }, { status: 500 });
    }

    const allTiles = (dashboard.pages || []).flatMap((page) => 
      (page.tiles || []).map((tile, tidx) => ({
        dashboard_id: dbDashboard.id,
        title: tile.visualization?.title || 'Untitled Chart',
        chart_type: tile.visualization?.chartType || 'bar',
        data_field: 'ai_custom', // Required by schema
        query_config: tile.query,
        visualization_config: tile.visualization,
        layout: tile.layout,
        position: tidx,
        page_name: page.name,
        _tileId: tile.id // Temp ID for deduplication
      }))
    );

    // DEDUPLICATE tiles by their unique ID before inserting
    const seenTileIds = new Set<string>();
    const uniqueTiles = allTiles.filter(t => {
      if (seenTileIds.has(t._tileId)) return false;
      seenTileIds.add(t._tileId);
      return true;
    }).map((t) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _tileId, ...rest } = t;
      return rest;
    }); // Remove temp ID before insert

    if (uniqueTiles.length > 0) {
      const { error: tileError } = await supabaseAdmin
        .from('dashboard_charts')
        .insert(uniqueTiles);
      
      if (tileError) {
        console.error('Failed to insert tiles:', tileError);
      }
    } else {
      console.warn('[AI Generate] No unique tiles to insert after deduplication');
    }

    return NextResponse.json({ 
      dashboard: {
        ...dashboard,
        id: dbDashboard.id,
        slug: dbDashboard.slug
      } 
    });
  } catch (err) {
    console.error('AI generate error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
