import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import { cookies } from 'next/headers';

export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rootCause = searchParams.get('root_cause') || '';
    const report = searchParams.get('report') || '';
    const area = searchParams.get('area') || '';
    const category = searchParams.get('category') || '';

    if (!rootCause) {
      return NextResponse.json({ error: 'Root cause text is required' }, { status: 400 });
    }

    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://ridzki-nrzngr-gapura-ai.hf.space';
    
    const targetUrl = new URL(`${AI_SERVICE_URL}/api/ai/root-cause/classify`);
    targetUrl.searchParams.set('root_cause', rootCause);
    if (report) targetUrl.searchParams.set('report', report);
    if (area) targetUrl.searchParams.set('area', area);
    if (category) targetUrl.searchParams.set('category', category);

    const aiResponse = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!aiResponse.ok) {
      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const result = await aiResponse.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Root Cause Classification Error:', error);
    return NextResponse.json(
      { error: 'Failed to classify root cause', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
// Complexity: Time O(1) + Network | Space O(1)
