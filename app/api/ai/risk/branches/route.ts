import { NextResponse, NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const esklasiRegex = new URL(req.url).searchParams.get('esklasi_regex') || '';
    const url = `https://gapura-dev-gapura-ai.hf.space/api/ai/risk/branches?bypass_cache=true&esklasi_regex=${encodeURIComponent(esklasiRegex)}`;
    console.log('[API Proxy] /api/ai/risk/branches ->', url);
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.error(`[API Proxy] Failed to fetch branch risk data: ${response.status}`);
      // Soften failure to avoid client console errors; return empty object
      return NextResponse.json({}, { status: 200 });
    }

    const data = await response.json();
    if (!data || typeof data !== 'object') {
      return NextResponse.json({}, { status: 200 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Proxy] Error fetching branch risk data:', error);
    // Return empty object on unexpected error to keep embeds stable
    return NextResponse.json({}, { status: 200 });
  }
}
