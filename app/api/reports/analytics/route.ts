import { NextRequest, NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';
    
    // Fetch all reports from Google Sheets
    const reports = await reportsService.getReports({ refresh });
    
    // Return with caching headers
    return NextResponse.json({
      timestamp: Date.now(),
      count: reports.length,
      reports
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      }
    });

  } catch (err) {
    console.error('Analytics API error:', err);
    return NextResponse.json({ 
      error: 'Failed to fetch reports',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
