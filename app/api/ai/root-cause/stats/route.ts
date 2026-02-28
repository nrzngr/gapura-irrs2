import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Proxy for AI Root Cause Statistics
 * GET /api/ai/root-cause/stats
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verify Session
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Prepare External Request
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://ridzki-nrzngr-gapura-ai.hf.space';
    const targetUrl = `${AI_SERVICE_URL}/api/ai/root-cause/stats`;

    console.log(`[Proxy] Fetching root cause stats from: ${targetUrl}`);

    // 3. Call AI Service
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      console.error(`[Proxy] AI Service failed: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `AI Service Error: ${response.statusText}` },
        { status: response.status }
      );
    }

    // 4. Return Data
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[Proxy] Error fetching root cause stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch analysis from AI service',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
