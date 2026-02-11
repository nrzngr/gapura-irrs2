import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';

interface TileSummary {
  id: string;
  title: string;
  chartType: string;
  columns: string[];
  sampleRows: Record<string, unknown>[];
  rowCount: number;
}

interface InsightRequest {
  dashboardName: string;
  subtitle?: string;
  tiles: TileSummary[];
}

interface TileInsight {
  tileId: string;
  keyFindings: string[];
  narrative: string;
}

interface InsightsResponse {
  executiveSummary: string[];
  tileInsights: TileInsight[];
  recommendations: string[];
  closingStatement: string;
}

// Complexity: Time O(tiles) | Space O(prompt_length + response)
function buildInsightsPrompt(req: InsightRequest): string {
  const tileSections = req.tiles.map((t, i) => {
    const sampleStr = t.sampleRows.slice(0, 8).map(r =>
      t.columns.map(c => `${c}: ${r[c] ?? '-'}`).join(', ')
    ).join('\n    ');

    return `  **Chart ${i + 1}: "${t.title}"** (Tipe: ${t.chartType}, ${t.rowCount} baris)
    Kolom: ${t.columns.join(', ')}
    Data sampel:
    ${sampleStr}`;
  }).join('\n\n');

  return `Kamu adalah seorang analis profesional di Gapura Indonesia (ground handling bandara).
Tugasmu: buat insight presentasi dari data dashboard berikut.

Dashboard: "${req.dashboardName}"
${req.subtitle ? `Subtitle: "${req.subtitle}"` : ''}

DATA PER CHART:
${tileSections}

KEMBALIKAN JSON PERSIS dengan format ini:
{
  "executiveSummary": [
    "Poin ringkasan eksekutif 1 — singkat, padat, data-driven",
    "Poin ringkasan eksekutif 2",
    "Poin ringkasan eksekutif 3",
    "Poin ringkasan eksekutif 4 (opsional)",
    "Poin ringkasan eksekutif 5 (opsional)"
  ],
  "tileInsights": [
    {
      "tileId": "tile-id-xxx",
      "keyFindings": [
        "Temuan kunci 1 — spesifik, sebutkan angka",
        "Temuan kunci 2"
      ],
      "narrative": "Paragraf singkat 1-2 kalimat yang menjelaskan insight utama dari chart ini dari sudut pandang analis ground handling."
    }
  ],
  "recommendations": [
    "Rekomendasi aksi 1 — konkret dan actionable",
    "Rekomendasi aksi 2",
    "Rekomendasi aksi 3"
  ],
  "closingStatement": "Kalimat penutup profesional 1-2 kalimat."
}

ATURAN:
1. Setiap tileInsight.tileId HARUS cocok dengan id tile yang diberikan
2. Gunakan Bahasa Indonesia profesional
3. Sebutkan angka/persentase spesifik dari data
4. Insight harus relevan dengan konteks ground handling bandara
5. Recommendations harus actionable dan konkret
6. Executive summary maksimal 5 poin
7. JANGAN buat insight yang tidak didukung oleh data`;
}

// Complexity: Time O(1) — single API call | Space O(response)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySession(session);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: InsightRequest = await request.json();

    if (!body.tiles || body.tiles.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data tile' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key belum dikonfigurasi' }, { status: 500 });
    }

    const prompt = buildInsightsPrompt(body);

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Kamu analis data profesional. Kembalikan HANYA JSON valid tanpa markdown code fences.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 4096,
        temperature: 0.4,
      }),
    });

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text();
      console.error('[export-insights] OpenAI error:', openaiRes.status, errBody);
      return NextResponse.json({ error: 'Gagal menghubungi AI' }, { status: 502 });
    }

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'AI tidak mengembalikan respons' }, { status: 502 });
    }

    let insights: InsightsResponse;
    try {
      insights = JSON.parse(content);
    } catch {
      console.error('[export-insights] Failed to parse:', content);
      return NextResponse.json({ error: 'Format AI tidak valid' }, { status: 422 });
    }

    return NextResponse.json(insights);
  } catch (err) {
    console.error('[export-insights] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
