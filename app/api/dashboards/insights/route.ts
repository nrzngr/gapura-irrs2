import { NextRequest, NextResponse } from 'next/server';
import { OpenRouter } from '@openrouter/sdk';
import { supabase } from '@/lib/supabase';
import { buildSchemaContextForAI, TABLES, JOINS, getFieldDef } from '@/lib/builder/schema';
import { normalizeQuery, normalizeVisualization } from '@/lib/builder/normalization';
import crypto from 'crypto';


// AI Configuration
const AI_API_KEY = process.env.GROQ_API_KEY;
const AI_BASE_URL = 'https://api.groq.com/openai/v1';
const AI_MODEL = 'llama-3.1-8b-instant';

// Rate limiting
const requestTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per minute per chart

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

// Persistent cache helpers
async function getPersistentCache(cacheKey: string) {
  const { data, error } = await supabase
    .from('ai_cache_entries')
    .select('*')
    .eq('cache_key', cacheKey)
    .single();
    
  if (error || !data) return null;
  return data;
}

async function setPersistentCache(
  cacheKey: string, 
  insights: Record<string, unknown>, 
  supportingCharts: unknown, 
  metadata: Record<string, unknown>
) {
  await supabase
    .from('ai_cache_entries')
    .upsert({
      cache_key: cacheKey,
      insights,
      supporting_charts: supportingCharts,
      metadata,
      created_at: new Date().toISOString()
    });
}

export async function POST(req: NextRequest) {
  try {
    const body: InsightRequest = await req.json();
    const { chartTitle, chartType, dashboardId, tileId, totalRows, dataSample, statistics, dateRange } = body;
    
    // Generate cache key
    const cacheKey = generateCacheKey(body);
    
    // 4. PERSISTENT CACHE LOOKUP
    const cachedEntry = await getPersistentCache(cacheKey);
    if (cachedEntry) {
      console.log(`[AI Insights] Cache hit for tile: ${tileId}`);
      return NextResponse.json({
        insights: cachedEntry.insights,
        generatedAt: cachedEntry.created_at,
        cached: true
      });
    }
    
    // Check rate limit
    if (!checkRateLimit(tileId)) {
      console.warn(`[AI Insights] Rate limit exceeded for tile: ${tileId}`);
      return NextResponse.json({
        insights: generateFallbackInsights(),
        generatedAt: new Date().toISOString(),
        rateLimited: true,
        message: 'Terlalu banyak permintaan. Silakan coba lagi dalam beberapa menit.'
      });
    }
    
    // Fetch context from Supabase if IDs are available
    let dashboardContext = '';
    let chartContext = '';

    if (dashboardId) {
        const { data: dashboard } = await supabase
            .from('custom_dashboards')
            .select('name, description, config')
            .eq('id', dashboardId)
            .single();
        
        if (dashboard) {
            dashboardContext = `DASHBOARD: ${dashboard.name}\nDESKRIPSI: ${dashboard.description || 'Tidak ada deskripsi'}\n`;
        }
    }

    if (tileId) {
        const { data: chart } = await supabase
            .from('dashboard_charts')
            .select('query_config, visualization_config')
            .eq('id', tileId)
            .single();
        
        if (chart) {
            chartContext = `QUERY CONFIG: ${JSON.stringify(chart.query_config)}\n`;
        }
    }
    
    // Construct the prompt with enriched context
    const prompt = generatePrompt({
      chartTitle,
      chartType,
      totalRows,
      dataSample,
      statistics,
      dateRange,
      context: `${dashboardContext}${chartContext}`
    });
    
    // Call AI (Groq)
    const aiResponse = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
        },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
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
        ],
        temperature: 0.7,
        max_tokens: 4000,
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
    
    let insightsText = completion.choices?.[0]?.message?.content || '{}';
    
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
    
    // 5. PERSISTENT CACHE STORAGE
    await setPersistentCache(cacheKey, insights, (insights as Record<string, unknown>).supportingCharts, {
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
    console.error('AI Insights Error:', error);
    
    // Return fallback if AI fails
    return NextResponse.json({
      insights: generateFallbackInsights(),
      generatedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Gagal menghasilkan insight'
    });
  }
}

function generatePrompt(data: InsightRequest & { context?: string }): string {
  const { chartTitle, chartType, totalRows, dataSample, statistics, dateRange, context } = data;
  const schemaContext = buildSchemaContextForAI();
  
  return `<IDENTITY>
Anda adalah Senior Operational Auditor & Principal Insights Architect untuk Gapura Angkasa.
Spesialisasi Anda adalah **Diagnostic Data Storytelling**: menghubungkan titik-titik antara data operasional, kepatuhan safety, dan dampak finansial.
Anda tidak hanya melaporkan data; Anda mendiagnosis kesehatan sistem ground handling.
</IDENTITY>

<DIAGNOSTIC_FRAMEWORK>
Dalam menganalisis data ini, gunakan metodologi **"5-Whys"** dan **"Pareto Principle (80/20)"**:
1. OBSERVASI: Identifikasi kontributor 20% teratas yang menyebabkan 80% volume/masalah.
2. HIPOTESIS: Buat dugaan cerdas mengapa pola ini muncul (misal: "Lonjakan di Cabang X mungkin terkait dengan turnover staf atau overload peralatan").
3. DIAGNOSA: Validasi hipotesis dengan menghubungkan dimensi (misal: "Benar, karena korelasi antara Delay dan Maskapai Low-Cost sangat tinggi").
4. ACTIONS: Berikan rekomendasi yang bersifat **Preemtif** (mencegah) bukan hanya Reaktif.
</DIAGNOSTIC_FRAMEWORK>

<OPERATIONAL_CONTEXT>
- SOURCE: ${context || 'Analisis Umum'}
- FOCUS: ${chartTitle} (${chartType})
- DATA RANGE: ${dateRange ? `${dateRange.from} s/d ${dateRange.to}` : 'All historic data'}
- SCHEMA IQ:
${schemaContext}
</OPERATIONAL_CONTEXT>

<RAW_INTELLIGENCE_SNAPSHOT>
- Total Volume: ${statistics.total}
- Peak/Mean/Base: ${statistics.maximum} / ${statistics.average.toFixed(2)} / ${statistics.minimum}
- Data Distribution (Sample):
${JSON.stringify(dataSample, null, 2)}
</RAW_INTELLIGENCE_SNAPSHOT>

<STRATEGIC_IMPACT_SCORING>
Untuk setiap temuan, tentukan **Operational Impact Score (1-10)**:
- 1-3: Minor (Inefisiensi administratif)
- 4-6: Moderate (Penurunan kualitas layanan/KPI)
- 7-10: Critical (Potensi Ground Damage, Pelanggaran Safety, atau Kerugian Finansial Besar)
</STRATEGIC_IMPACT_SCORING>

<SUPPORTING_CHART_DECISION_TREE>
Mandat Senior Analyst: Buat minimal 4 chart pendukung untuk investigasi lanjutan.
- Jika ada anomali maskapai -> Heatmap Airline vs Category.
- Jika ada lonjakan volume -> Area chart Temporal Trend (Month/Week).
- Jika ada isu safety -> Pie chart Severity distribution.
- Selalu prioritaskan HEATMAP untuk perbandingan 2 dimensi kategorikal.
</SUPPORTING_CHART_DECISION_TREE>

<OUTPUT_DEFINITION>
Return a valid JSON object. DO NOT use markdown formatting.
{
  "ringkasan": "Executive Summary (3-4 kalimat). Berikan skor kesehatan operasional (0-100%).",
  "temuanUtama": [
    {
      "diagnosa": "DIAGNOSA 1: Penjelasan naratif mendalam tentang temuan",
      "data": { "Dimension_Name": "Value", "Metric_Name": 12 },
      "impactScore": 8
    }
  ],
  "__RULES__": [
    "DILARANG menyertakan field data (seperti 'maskapai') jika dimensinya tidak ada dalam RAW_INTELLIGENCE_SNAPSHOT",
    "Field 'data' harus berisi pasangan key-value dari dimensi dan metrik nyata yang ada di snapshot di atas",
    "JANGAN gunakan placeholder atau string kosong"
  ],
  "tren": [{"label": "Target", "arah": "naik|turun|stabil|kritis", "persentase": 0, "deskripsi": "Strategic context."}],
  "rekomendasi": [
    "REKOMENDASI 1: Tindakan mitigasi konkret",
    "REKOMENDASI 2: Perubahan SOP/Workflow"
  ],
  "anomali": [{"label": "Outlier", "nilai": "N", "deskripsi": "Why this happened?"}],
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
    }
  ],
  "kesimpulan": "Final strategic verdict.",
  "saranEksplorasi": ["Topic for deeper drill-down 1", "2"]
}
</OUTPUT_DEFINITION>`;
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
    ringkasan: "Layanan AI sementara tidak tersedia. Data tabel masih dapat diakses lengkap.",
    temuanUtama: [
      "Data tersedia untuk analisis manual",
      "Statistik dasar dapat dilihat di panel summary",
      "Export data tersedia dalam format CSV"
    ],
    tren: [],
    rekomendasi: [
      "Silakan analisis data secara manual menggunakan tabel yang tersedia",
      "Export data untuk analisis lebih lanjut di tools lain"
    ],
    anomali: [],
    kesimpulan: "Data berhasil dimuat. Fitur AI akan tersedia kembali segera."
  };
}
