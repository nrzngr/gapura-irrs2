import { NextResponse, NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const esklasiRegex = new URL(req.url).searchParams.get('esklasi_regex') || '';
    const url = `https://gapura-dev-gapura-ai.hf.space/api/ai/risk/hubs?esklasi_regex=${encodeURIComponent(esklasiRegex)}`;
    const response = await fetch(url, {
      cache: 'no-store', // Disable caching
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.error(`[API Proxy] Failed to fetch hub risk data: ${response.status}`);
      return NextResponse.json(
        { error: `Failed to fetch data: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Proxy] Error fetching hub risk data:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
