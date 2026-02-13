import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { OpenRouter } from '@openrouter/sdk';
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

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key belum dikonfigurasi' }, { status: 500 });
    }

    const openrouter = new OpenRouter({ apiKey });
    const prompt = buildInsightsPrompt(body);

    let content;
    try {
      const completion: any = await openrouter.chat.send({
        httpReferer: 'https://gapura.id',
        xTitle: 'Gapura Dashboard',
        chatGenerationParams: {
          model: "arcee-ai/trinity-large-preview:free",
          messages: [
            { role: 'system', content: 'Kamu analis data profesional. Kembalikan HANYA JSON valid tanpa markdown code fences.' },
            { role: 'user', content: prompt },
          ],
          maxTokens: 4096,
          temperature: 0.4,
          stream: false,
          provider: {
            dataCollection: "allow"
          }
        }
      });
      content = completion.choices?.[0]?.message?.content;
    } catch (error: any) {
      console.error('[export-insights] OpenRouter error:', error);
      return NextResponse.json({ error: 'Gagal menghubungi AI' }, { status: 502 });
    }

    if (!content) {
      return NextResponse.json({ error: 'AI tidak mengembalikan respons' }, { status: 502 });
    }

    // Clean <think> tags from reasoning models
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    let insights: InsightsResponse;
    try {
      // Try extracting JSON if wrapped in markdown
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
         content = jsonMatch[1];
      }
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
