import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text') || '';
    const topK = searchParams.get('top_k') || '5';
    const threshold = searchParams.get('threshold') || '0.3';

    if (!text) {
      return NextResponse.json({ error: 'Text parameter is required' }, { status: 400 });
    }

    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    const targetUrl = new URL(`${AI_SERVICE_URL}/api/ai/similar`);
    targetUrl.searchParams.set('text', text);
    targetUrl.searchParams.set('top_k', topK);
    targetUrl.searchParams.set('threshold', threshold);

    const aiResponse = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const result = await aiResponse.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Similarity Search Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch similar reports', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
// Complexity: Time O(1) + Network | Space O(1)
