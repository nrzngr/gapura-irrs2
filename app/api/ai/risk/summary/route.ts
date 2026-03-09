import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Cache for 5 minutes

/**
 * API endpoint untuk mendapatkan ringkasan risiko
 * Proxies request to Python AI service
 */
export async function GET(req: NextRequest) {
  try {
    // Verifikasi session
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Panggil AI service (Python FastAPI)
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://gapura-dev-gapura-ai.hf.space';
    
    const { searchParams } = new URL(req.url);
    const esklasiRegex = searchParams.get('esklasi_regex') || '';

    try {
      const aiResponse = await fetch(`${AI_SERVICE_URL}/api/ai/risk/summary?esklasi_regex=${encodeURIComponent(esklasiRegex)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Cache for 5 minutes
        next: { revalidate: 300 }
      });

      if (!aiResponse.ok) {
        throw new Error(`AI service error: ${aiResponse.status}`);
      }

      const aiResult = await aiResponse.json();

      return NextResponse.json(aiResult);
    } catch (aiError) {
      console.error('AI Service Error:', aiError);
      
      // Return error - no fallback/mock data
      return NextResponse.json(
        { 
          error: 'AI service tidak tersedia',
          details: aiError instanceof Error ? aiError.message : 'Unknown error'
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Risk Summary API Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil ringkasan risiko' },
      { status: 500 }
    );
  }
}
