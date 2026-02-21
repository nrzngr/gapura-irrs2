import { NextRequest, NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';

export async function GET(request: NextRequest) {
  try {
    // Optional safeguard: enable this endpoint only when explicitly allowed (DX/debug mode)
    if (process.env.NEXT_PUBLIC_DEBUG_SHEETS !== 'true') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit: number | undefined = limitParam ? Number(limitParam) : undefined;

    // Fetch latest data from Google Sheets (force refresh for debugging)
    const data = await reportsService.getReports({ refresh: true });
    let results = data;
    if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
      results = data.slice(0, limit);
    }
    return NextResponse.json({ count: data.length, data: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
