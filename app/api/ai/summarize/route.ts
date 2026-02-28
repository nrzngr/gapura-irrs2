import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category'); // e.g. non_cargo
    
    // Determine path based on category
    // If category=non_cargo => /api/ai/summarize?category=non_cargo
    // If category=cgo => /api/ai/summarize/cgo
    // default => /api/ai/summarize

    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://ridzki-nrzngr-gapura-ai.hf.space';
    let path = '/api/ai/summarize';
    
    if (category === 'cgo') {
      path = '/api/ai/summarize/cgo';
    } else if (category) {
      path = `/api/ai/summarize?category=${category}`;
    }

    const aiResponse = await fetch(`${AI_SERVICE_URL}${path}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const result = await aiResponse.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Summarization Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summary', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
// Complexity: Time O(1) + Network | Space O(1)
