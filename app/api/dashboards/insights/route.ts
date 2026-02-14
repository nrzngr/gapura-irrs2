import { NextRequest, NextResponse } from 'next/server';
import { OpenRouter } from '@openrouter/sdk';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

// OpenRouter Configuration
const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// In-memory cache for AI insights
interface CacheEntry {
  insights: unknown;
  timestamp: number;
  requestHash: string;
}

const insightsCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_CACHE_SIZE = 100; // Maximum number of cached entries

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
    // Use first 10 rows of data sample for cache key
    dataSample: body.dataSample.slice(0, 10)
  };
  return crypto.createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
}

// Check rate limit
function checkRateLimit(tileId: string | undefined): boolean {
  if (!tileId) return true; // Allow if no tileId
  
  const now = Date.now();
  const timestamps = requestTimestamps.get(tileId) || [];
  
  // Remove old timestamps outside the window
  const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false; // Rate limit exceeded
  }
  
  validTimestamps.push(now);
  requestTimestamps.set(tileId, validTimestamps);
  return true;
}

// Get cached insights
function getCachedInsights(cacheKey: string): unknown | null {
  const cached = insightsCache.get(cacheKey);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    insightsCache.delete(cacheKey);
    return null;
  }
  
  return cached.insights;
}

// Set cached insights
function setCachedInsights(cacheKey: string, insights: unknown): void {
  // Clean up old entries if cache is too large
  if (insightsCache.size >= MAX_CACHE_SIZE) {
    const now = Date.now();
    for (const [key, entry] of insightsCache.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        insightsCache.delete(key);
      }
    }
    
    // If still too large, remove oldest entry
    if (insightsCache.size >= MAX_CACHE_SIZE) {
      let oldestKey = '';
      let oldestTime = Infinity;
      for (const [key, entry] of insightsCache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }
      if (oldestKey) insightsCache.delete(oldestKey);
    }
  }
  
  insightsCache.set(cacheKey, {
    insights,
    timestamp: Date.now(),
    requestHash: cacheKey
  });
}

export async function POST(req: NextRequest) {
  try {
    const body: InsightRequest = await req.json();
    const { chartTitle, chartType, dashboardId, tileId, totalRows, dataSample, statistics, dateRange } = body;
    
    // Generate cache key
    const cacheKey = generateCacheKey(body);
    
    // Check cache first
    const cachedInsights = getCachedInsights(cacheKey);
    if (cachedInsights) {
      console.log(`[AI Insights] Cache hit for tile: ${tileId}`);
      return NextResponse.json({
        insights: cachedInsights,
        generatedAt: new Date().toISOString(),
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
    
    // Call AI without timeout (model takes time to respond)
    const completion: any = await openrouter.chat.send({
      httpReferer: 'https://gapura.id',
      xTitle: 'Gapura Dashboard',
      chatGenerationParams: {
        model: "arcee-ai/trinity-large-preview:free",
        messages: [
          {
            role: "system",
            content: "Anda adalah Senior Aviation Quality Assurance Analyst untuk Gapura Angkasa (Ground Handling). Tugas Anda adalah memberikan analisis kritis, mendalam, dan actionable untuk manajemen operasional. Fokus pada integritas data, tren keselamatan/kualitas, dan efisiensi operasional. Jangan memberikan saran generik. Gunakan terminologi penerbangan yang tepat (e.g., OTP, SLA, Irregularity). Analisis harus berbasis data yang diberikan, bukan asumsi umum. JANGAN GUNAKAN EMOJI PADA OUTPUT."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        maxTokens: 2000,
        stream: false,
        provider: {
          dataCollection: "allow"
        }
      }
    });
    
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
    
    // Cache the insights
    setCachedInsights(cacheKey, insights);
    
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
  
  return `
Analisis data ground handling berikut dan berikan insight strategis untuk perbaikan operasional maupun layanan.

KONTEKS DASHBOARD:
${context || 'Analisis Umum'}

DETAIL CHART:
- Judul: ${chartTitle}
- Tipe Visualisasi: ${chartType}
- Total Data: ${totalRows} baris
${dateRange ? `- Periode: ${dateRange.from} s/d ${dateRange.to}` : ''}

RINGKASAN STATISTIK:
- Total Volume: ${statistics.total.toLocaleString('id-ID')}
- Rata-rata per entitas: ${statistics.average.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
- Nilai Tertinggi: ${statistics.maximum.toLocaleString('id-ID')}
- Nilai Terendah: ${statistics.minimum.toLocaleString('id-ID')}

SAMPEL DATA (Top 50 Rows):
${JSON.stringify(dataSample, null, 2)}

INSTRUKSI ANALISIS:
1. Identifikasi pola dominan (pareto) pada data. 
2. Cari anomali spesifik (misal: cabang/maskapai dengan performa jauh di bawah rata-rata).
3. Hubungkan data dengan potensi isu operasional (misal: delay handling, complain penumpang).
4. Berikan rekomendasi perbaikan proses konkret.

JANGAN BERIKAN SARAN GENERIK SEPERTI "TINGKATKAN KUALITAS". BERIKAN SARAN SPESIFIK BERDASARKAN DATA, CONTOH: "FOKUS PERBAIKAN PADA CABANG CGK KARENA MENYUMBANG 40% KELUHAN".

FORMAT OUTPUT (JSON):
{
  "ringkasan": "Paragraph pendek (3-4 kalimat) executive summary yang menhighlight isu paling kritis.",
  "temuanUtama": ["Point-point spesifik dengan data pendukung (angka/%)", "JANGAN gunakan emoji", "Fokus pada 'Why' dan 'So What'"],
  "tren": [
    {
      "label": "Nama Cabang/Maskapai/Kategori",
      "arah": "naik/turun/stabil/kritis",
      "persentase": 0,
      "deskripsi": "Penjelasan konteks kenapa ini trend penting"
    }
  ],
  "rekomendasi": ["Saran spesifik 1 (Taktis/Jangka Pendek)", "Saran spesifik 2 (Strategis/Jangka Panjang)"],
  "anomali": [
    {
      "label": "Entitas yang outlier",
      "nilai": "string",
      "deskripsi": "Kenapa ini anomali? (Misal: 3x lipat rata-rata)"
    }
  ],
  "kesimpulan": "Satu kalimat penutup yang merangkum status kesehatan operasional berdasarkan data ini."
}

PENTING: Pastikan semua nilai di dalam JSON valid. Nilai yang mengandung ":" (rasio), "%", atau teks harus diapit tanda kutip ganda (quoted string).`;
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
