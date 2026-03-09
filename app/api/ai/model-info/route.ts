import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { reportsService } from '@/lib/services/reports-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/model-info
 * 
 * Get detailed model information and metrics
 * Fetches actual data from Google Sheets to show real statistics
 */
export async function GET(request: Request) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = await verifySession(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Fetch actual reports from Google Sheets to get real data count
    let reportsCount = 0;
    try {
      const reports = await reportsService.getReports();
      reportsCount = reports.length;
      console.log(`[AI Model Info] Fetched ${reportsCount} reports from Google Sheets`);
    } catch (err) {
      console.error('[AI Model Info] Failed to fetch reports:', err);
    }

    // Call the Python AI service
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://gapura-dev-gapura-ai.hf.space';
    console.log('[AI Model Info] URL:', AI_SERVICE_URL);
    
    const { searchParams } = new URL(request.url);
    const esklasiRegex = searchParams.get('esklasi_regex') || '';

    try {
      const aiResponse = await fetch(`${AI_SERVICE_URL}/api/ai/model-info?esklasi_regex=${encodeURIComponent(esklasiRegex)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!aiResponse.ok) {
        throw new Error(`AI service returned ${aiResponse.status}`);
      }

      const data = await aiResponse.json();
      
      // Override with actual Google Sheets data count
      if (data.regression?.metrics) {
        data.regression.metrics.n_samples = reportsCount || data.regression.metrics.n_samples;
      }
      
      return NextResponse.json(data);
    } catch (error) {
      console.error('[AI Model Info] AI service unavailable:', error);
      
      // Return error - no mock data
      return NextResponse.json(
        { 
          error: 'AI service tidak tersedia. Pastikan service AI berjalan di localhost:8000',
          reports_count: reportsCount,
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('[AI Model Info] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
