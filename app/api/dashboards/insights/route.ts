import { NextRequest, NextResponse } from 'next/server';
import { normalizeQuery, normalizeVisualization } from '@/lib/builder/normalization';
import { buildSchemaContextForAI } from '@/lib/builder/schema';
import { callAI } from '@/lib/ai/openrouter';
import crypto from 'crypto';

// AI Configuration
const AI_MODEL = 'openai/gpt-oss-20b:free';

// Rate limiting
const requestTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per minute per chart

// In-memory cache for insights (replaces Supabase persistent cache)
const insightsCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface InsightRequest {
  chartTitle: string;
  chartType: string;
  dashboardId?: string;
  tileId?: string;
  totalRows: number;
  dataSample: Array<Record<string, unknown>>;
  statistics: {
    total: number;
    average: number;
    maximum: number;
    minimum: number;
  };
  dateRange?: {
    from: string;
    to: string;
  };
}

// Generate cache key from request
function generateCacheKey(body: InsightRequest): string {
  const keyData = {
    chartTitle: body.chartTitle,
    chartType: body.chartType,
    dashboardId: body.dashboardId,
    tileId: body.tileId,
    totalRows: body.totalRows,
    statistics: body.statistics,
    dateRange: body.dateRange,
    // Use first 50 rows for better uniqueness
    dataSample: body.dataSample.slice(0, 50)
  };
  return crypto.createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
}

// Check rate limit
function checkRateLimit(tileId: string | undefined): boolean {
  if (!tileId) return true;
  const now = Date.now();
  const timestamps = requestTimestamps.get(tileId) || [];
  const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) return false;
  validTimestamps.push(now);
  requestTimestamps.set(tileId, validTimestamps);
  return true;
}

// In-memory cache helpers
function getMemoryCache(cacheKey: string) {
  const entry = insightsCache.get(cacheKey);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    insightsCache.delete(cacheKey);
    return null;
  }
  
  return entry.data;
}

function setMemoryCache(
  cacheKey: string, 
  insights: Record<string, unknown>, 
  supportingCharts: unknown, 
  metadata: Record<string, unknown>
) {
  insightsCache.set(cacheKey, {
    data: { insights, supporting_charts: supportingCharts, metadata },
    timestamp: Date.now()
  });
  
  // Prune cache if too large
  if (insightsCache.size > 1000) {
    const oldestKey = insightsCache.keys().next().value;
    if (oldestKey) insightsCache.delete(oldestKey);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: InsightRequest = await req.json();
    const { chartTitle, chartType, tileId, totalRows } = body;
    
    // Generate cache key
    const cacheKey = generateCacheKey(body);
    
    // Check cache
    const cached = getMemoryCache(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true
      });
    }

    // Rate limiting
    if (!checkRateLimit(tileId)) {
      return NextResponse.json({ 
        error: 'Too many requests', 
        fallback: {
          ringkasan: "Terlalu banyak permintaan analisis. Mohon tunggu sebentar.",
          temuanUtama: [],
          tren: [],
          rekomendasi: [],
          anomali: [],
          kesimpulan: "Sistem sedang sibuk."
        }
      }, { status: 429 });
    }

    // Construct the prompt
    // Note: We skip fetching dashboard/chart context from Supabase to avoid DB dependency
    const prompt = generatePrompt({
      ...body,
      context: 'Analysis based on provided data sample.'
    });

    // Call AI (OpenRouter)
    let insightsText;
    try {
      insightsText = await callAI([
        {
          role: "system",
          content: `Anda adalah Senior Aviation Quality Assurance Analyst untuk Gapura Angkasa (Ground Handling). Tugas Anda adalah memberikan analisis kritis, sangat mendalam (comprehensive), dan actionable untuk manajemen operasional.

ATURAN PENTING:
1. JANGAN MEMBATASI KEDALAMAN ANALISIS — eksplorasi setiap detil yang relevan dari data yang diberikan
2. Fokus pada integritas data, tren keselamatan/kualitas, efisiensi operasional, dan korelasi antar dimensi
3. JANGAN gunakan emoji
4. Gunakan bahasa Indonesia yang profesional namun tegas
5. Target Anda adalah memberikan 'Data Storytelling' yang mengubah angka menjadi narasi strategi bisnis
6. PENTING: Selalu kembalikan respons dalam format JSON yang valid sesuai dengan format yang diminta user
7. JANGAN gunakan markdown formatting (**, *, #, dll) dalam JSON
8. Semua teks dalam JSON harus plain text tanpa formatting markdown
9. SORTING SAFETY: JANGAN PERNAH mengurutkan (ORDER BY) berdasarkan kolom mentah (seperti "id") jika sedang menggunakan GROUP BY. Gunakan alias ukuran (seperti "Jumlah") atau kolom dimensi yang ada di group by.`
        },
        {
          role: "user",
          content: prompt
        }
      ], AI_MODEL);
    } catch (error) {
       console.error('AI API error:', error);
       throw new Error(`AI API error: ${error}`);
    }
    
    // Clean <think> tags from reasoning models
    insightsText = insightsText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Parse the JSON response
    let insights;
    try {
      // 1. Try cleaning markdown code blocks
      let jsonContent = insightsText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
      
      // 2. If that fails or if there's extra text, try finding the first '{' and last '}'
      const firstBrace = jsonContent.indexOf('{');
      const lastBrace = jsonContent.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
      }

      // 3. SEC-OPS: Sanitize common malformed JSON values (unquoted ratios, etc.)
      jsonContent = jsonContent.replace(/:\s*([0-9]+\s*:\s*[0-9]+)\b/g, ': "$1"');
      jsonContent = jsonContent.replace(/:\s*([0-9.]+\s*%)\b/g, ': "$1"');

      insights = JSON.parse(jsonContent);
    } catch (parseError) {
      console.warn('JSON Parse Warning:', parseError);
      console.log('Raw Insights Text:', insightsText);
      insights = parseInsightsFromText(insightsText);
    }
    
    // 4. VALIDATE AND ENFORCE DATA TYPES (Prevent React "Objects not valid as child" errors)
    if (insights && typeof insights === 'object') {
      const insightsObj = insights as any;
      
      // Ensure specific arrays contain only strings
      const stringArrays = ['temuanUtama', 'rekomendasi', 'saranEksplorasi'];
      stringArrays.forEach(key => {
        if (Array.isArray(insightsObj[key])) {
          insightsObj[key] = insightsObj[key].map((item: any) => {
            if (typeof item === 'object' && item !== null) {
              // PRESERVE STRUCTURED FINDINGS: If it has 'diagnosa', it's a "Genius Tier" finding
              if (item.diagnosa) return item;
              
              // Fallback for other objects
              return item.label || item.deskripsi || JSON.stringify(item);
            }
            return String(item || '');
          });
        } else {
          insightsObj[key] = [];
        }
      });

      // Ensure 'anomali' and 'tren' fields are safe
      if (Array.isArray(insightsObj.anomali)) {
        insightsObj.anomali = insightsObj.anomali.map((a: any) => ({
          label: String(a?.label || 'Anomali'),
          nilai: (typeof a?.nilai === 'object') ? JSON.stringify(a.nilai) : (a?.nilai ?? 0),
          deskripsi: String(a?.deskripsi || '')
        }));
      } else {
        insightsObj.anomali = [];
      }

      if (Array.isArray(insightsObj.tren)) {
        insightsObj.tren = insightsObj.tren.map((t: any) => ({
          label: String(t?.label || 'Tren'),
          arah: String(t?.arah || 'stabil').toLowerCase(),
          persentase: Number(t?.persentase || 0),
          deskripsi: String(t?.deskripsi || '')
        }));
      } else {
        insightsObj.tren = [];
      }

      // Initialize supportingCharts if missing or not an array
      if (!Array.isArray(insightsObj.supportingCharts)) {
        insightsObj.supportingCharts = [];
      }

      // Deduplicate by title
      const seenTitles = new Set<string>();
      const rawCharts = insightsObj.supportingCharts as Array<{
        visualization?: { title?: string; chartType?: string };
        query?: unknown;
      }>;

      insightsObj.supportingCharts = rawCharts.filter(chart => {
        if (!chart || !chart.visualization || !chart.visualization.title) return false;
        // Basic validation of chart structure
        if (!chart.visualization.chartType || !chart.query) return false;
        
        // NORMALIZE QUERY
        chart.query = normalizeQuery(chart.query);
        if (!chart.query) return false;

        const normalizedTitle = chart.visualization.title.trim().toLowerCase();
        
        // APPLY SHARED VISUALIZATION RULES (Fail-safes, Axis syncing)
        chart = normalizeVisualization(chart as any);

        if (seenTitles.has(normalizedTitle)) return false;
        seenTitles.add(normalizedTitle);
        return true;
      });
    }
    
    // 5. CACHE STORAGE
    setMemoryCache(cacheKey, insights, (insights as Record<string, unknown>).supportingCharts, {
      model: AI_MODEL,
      chartTitle,
      chartType,
      totalRows
    });
    
    return NextResponse.json({
      insights,
      generatedAt: new Date().toISOString(),
      cached: false
    });

  } catch (error) {
    console.error('Insights generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate insights',
      fallback: {
        ringkasan: "Gagal menghasilkan analisis AI.",
        temuanUtama: ["Silakan coba lagi nanti."],
        tren: [],
        rekomendasi: [],
        anomali: [],
        kesimpulan: "Terjadi kesalahan sistem."
      }
    }, { status: 500 });
  }
}

function generatePrompt(data: InsightRequest & { context?: string }): string {
  const { chartTitle, chartType, totalRows, dataSample, statistics, dateRange, context } = data;
  const schemaContext = buildSchemaContextForAI();
  
  return `<SYSTEM_INSTRUCTION>
You are the **Lead Data Analyst** for Gapura Angkasa.
Your goal is to analyze the provided data snippet and generate **factual, data-driven insights**.
**CRITICAL RULE**: Do NOT hallucinate. Do NOT invent "maintenance issues", "targets", or "training needs" unless the data explicitly supports it.
If the data is just counts of categories, stick to describing the distribution (e.g., "Category X is dominant with 50%").

<BUSINESS_DOMAINS>
The system operates across 3 main Areas:
1. APRON: Airside operations, ramp handling.
2. TERMINAL: Landside operations, passenger handling.
3. GENERAL: General administration.

SPECIAL INSTRUCTION FOR CARGO (CGO):
- CGO reports are identified by keywords in 'description', 'title', or 'category'.
- Keywords: "cargo", "logistics", "warehouse", "dangerous goods", "live animal", "mail", "kargo", "gudang".
- When analyzing "Cargo" issues, look for these terms in the text fields.
</BUSINESS_DOMAINS>
</SYSTEM_INSTRUCTION>

<DATA_CONTEXT>
- Chart: "${chartTitle}" (${chartType})
- Total Rows: ${totalRows}
- Stats: Max=${statistics.maximum}, Avg=${statistics.average.toFixed(2)}, Min=${statistics.minimum}
- Date Range: ${dateRange ? `${dateRange.from} to ${dateRange.to}` : 'N/A'}
- Context: ${context || 'General Analysis'}
</DATA_CONTEXT>

<RAW_DATA_SAMPLE>
${JSON.stringify(dataSample, null, 2)}
</RAW_DATA_SAMPLE>

<ANALYSIS_TASKS>
1. **Executive Summary**: Summarize the data trends in 2 sentences. What is the main takeaway?
2. **Key Findings**: Identify the top 3 contributors or patterns. Use ACTUAL NUMBERS from the data sample.
3. **Anomalies**: Is there any value significantly higher/lower than others? If not, say "No significant anomalies".
4. **Recommendations**: Suggest 2 actions based ONLY on the data. (e.g., if "Delay" is high, suggest "Investigate root causes of Delay").
</ANALYSIS_TASKS>

<SUPPORTING_CHART_INSTRUCTIONS>
Generate EXACTLY 4 unique supporting charts to provide deeper context:
1. **Breakdown by another dimension**: If main chart is by Category, show by Branch or Airline.
2. **Trend Analysis**: Show the data over time (event_date) if possible.
3. **Top Contributors**: A horizontal bar chart of the top 5 contributing entities (e.g. specific airlines or branches).
4. **Composition**: A pie/donut chart showing the distribution of a key attribute (e.g. Status or Severity).

Rules:
- Do NOT repeat the main chart.
- Use different visualization types (bar, line, pie, horizontal_bar).
- Ensure queries are valid and use correct table/field names from schema.
</SUPPORTING_CHART_INSTRUCTIONS>

<OUTPUT_FORMAT>
Return a valid JSON object. NO markdown.
{
  "ringkasan": "Summary text here.",
  "temuanUtama": [
    {
      "diagnosa": "Finding 1 title",
      "data": { "Actual Dimension Name": "Value" }, 
      "impactScore": 5
    }
  ],
  "__RULES__": [
     "DO NOT use generic keys like 'Label', 'Metric_Name', 'Dimension_Name', 'Report Category', 'Branch'. Use the ACTUAL field name from the data (e.g., 'Singapore Airlines': 18, 'Irregularity': 50).",
     "The 'data' object should look like { 'Singapore Airlines': '18 reports', 'Emirates': '17 reports' }"
  ],
  "tren": [
    { "label": "Trend Name", "arah": "naik/turun/stabil", "persentase": 0, "deskripsi": "Description" }
  ],
  "rekomendasi": [
    "Recommendation 1",
    "Recommendation 2"
  ],
  "saranEksplorasi": [
    "Suggestion 1",
    "Suggestion 2"
  ],
  "anomali": [
    { "label": "Outlier Label", "nilai": "Value", "deskripsi": "Description" }
  ],
  "supportingCharts": [
    {
      "visualization": {
        "chartType": "bar|line|area|pie|donut|heatmap",
        "title": "Indonesian Insightful Title",
        "xAxis": "Alias mapper",
        "yAxis": ["Alias mapper"],
        "colorField": "For Heatmaps"
      },
      "query": {
        "source": "reports",
        "dimensions": [{"table": "reports", "field": "f", "alias": "A"}],
        "measures": [{"table": "reports", "field": "id", "function": "COUNT", "alias": "Jumlah"}],
        "sorts": [{"field": "Jumlah", "direction": "desc"}],
        "limit": 5
      }
    },
    { "visualization": { "title": "Chart 2" }, "query": {} },
    { "visualization": { "title": "Chart 3" }, "query": {} },
    { "visualization": { "title": "Chart 4" }, "query": {} }
  ],
  "kesimpulan": "Final conclusion."
}
</OUTPUT_FORMAT>`;
}

function parseInsightsFromText(text: string): unknown {
  const lines = text.split('\n').filter(line => line.trim());
  
  return {
    ringkasan: lines[0] || 'Analisis data telah selesai.',
    temuanUtama: lines.slice(1, 6).map(line => line.replace(/^[\s\-\•]+/, '').trim()),
    tren: [],
    rekomendasi: lines.slice(6, 9).map(line => line.replace(/^[\s\-\•]+/, '').trim()),
    anomali: [],
    kesimpulan: lines[lines.length - 1] || 'Data menunjukkan hasil yang signifikan.'
  };
}

function generateFallbackInsights() {
  return {
    ringkasan: "Tidak dapat memuat analisis AI saat ini. Silakan coba beberapa saat lagi.",
    temuanUtama: [
      "Data visualisasi telah berhasil dimuat.",
      "Analisis mendalam membutuhkan koneksi ke layanan AI.", 
      "Periksa koneksi internet Anda."
    ],
    tren: [],
    rekomendasi: ["Lakukan analisis manual berdasarkan data tabel."],
    anomali: [],
    kesimpulan: "Data tabel tersedia untuk direview secara manual."
  };
}
