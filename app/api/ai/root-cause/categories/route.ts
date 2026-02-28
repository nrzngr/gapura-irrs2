import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

/**
 * Proxy for AI Root Cause Categories Metadata
 * GET /api/ai/root-cause/categories
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://ridzki-nrzngr-gapura-ai.hf.space';
    const targetUrl = `${AI_SERVICE_URL}/api/ai/root-cause/categories`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `AI Service Error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Proxy] Error fetching root cause categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories from AI service' },
      { status: 500 }
    );
  }
}
