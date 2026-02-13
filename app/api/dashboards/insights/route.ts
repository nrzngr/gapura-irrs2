
import { NextRequest, NextResponse } from 'next/server';
import { OpenRouter } from '@openrouter/sdk';
import { supabase } from '@/lib/supabase';

// OpenRouter Configuration
const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

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

export async function POST(req: NextRequest) {
  try {
    const body: InsightRequest = await req.json();
    
    const { chartTitle, chartType, dashboardId, tileId, totalRows, dataSample, statistics, dateRange } = body;
    
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
    
    const completion: any = await openrouter.chat.send({
      httpReferer: 'https://gapura.id', // Required for free model rankings
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
        max_tokens: 2000,
        stream: false,
        provider: {
          dataCollection: "allow" // Required for free models
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

      insights = JSON.parse(jsonContent);
    } catch (parseError) {
      console.warn('JSON Parse Warning:', parseError);
      console.log('Raw Insights Text:', insightsText);
      // If parsing fails, create a structured response from the text
      insights = parseInsightsFromText(insightsText);
    }
    
    return NextResponse.json({
      insights,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('AI Insights Error:', error);
    return NextResponse.json(
      { 
        error: 'Gagal menghasilkan insight',
        fallback: generateFallbackInsights()
      },
      { status: 500 }
    );
  }
}

function generatePrompt(data: InsightRequest & { context?: string }): string {
  const { chartTitle, chartType, totalRows, dataSample, statistics, dateRange, context } = data;
  
  return `
Analisis data ground handling berikut dan berikan insight strategis untuk perbaikan operasional mapupun layanan.

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
      "persentase": 0, // Estimasi kenaikan/penurunan atau kontribusi %
      "deskripsi": "Penjelasan konteks kenapa ini trend penting"
    }
  ],
  "rekomendasi": ["Saran spesifik 1 (Taktis/Jangka Pendek)", "Saran spesifik 2 (Strategis/Jangka Panjang)"],
  "anomali": [
    {
      "label": "Entitas yang outlier",
      "nilai": 0,
      "deskripsi": "Kenapa ini anomali? (Misal: 3x lipat rata-rata)"
    }
  ],
  "kesimpulan": "Satu kalimat penutup yang merangkum status kesehatan operasional berdasarkan data ini."
}`;
}

function parseInsightsFromText(text: string): unknown {
  // Fallback parser if JSON parsing fails
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
      "Export data tersedia dalam format CSV/Excel/PDF"
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
