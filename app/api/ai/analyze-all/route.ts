import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/ai/analyze-all
 * 
 * Analyze all reports from Google Sheets using the AI service
 * This is a proxy endpoint that calls the Python AI service
 */
export async function GET(request: NextRequest) {
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

    // Only allow analysts, admins, and branch managers
    const role = String(payload.role).trim().toUpperCase();
    if (role !== 'ANALYST' && role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'MANAGER_CABANG') {
      return NextResponse.json(
        { error: 'Forbidden: Analyst or Admin access required' },
        { status: 403 }
      );
    }

    // Get branch filter for MANAGER_CABANG
    let branchFilter: string | null = null;
    if (role === 'MANAGER_CABANG') {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('station:stations(name)')
        .eq('id', payload.id)
        .single();
      
      if (userData?.station) {
        branchFilter = (userData.station as any).name;
        console.log(`[AI API] Applying branch filter for MANAGER_CABANG: ${branchFilter}`);
      }
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const maxRows = searchParams.get('max_rows_per_sheet') || '10000';
    const bypassCache = searchParams.get('bypass_cache') || 'false';
    const includeRegression = searchParams.get('include_regression') || 'true';
    const includeNlp = searchParams.get('include_nlp') || 'true';
    const includeTrends = searchParams.get('include_trends') || 'true';

    // Call the Python AI service
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    console.log(`[AI API] Calling analyze-all with max_rows=${maxRows}`);
    
    const aiResponse = await fetch(
      `${AI_SERVICE_URL}/api/ai/analyze-all?max_rows_per_sheet=${maxRows}&bypass_cache=${bypassCache}&include_regression=${includeRegression}&include_nlp=${includeNlp}&include_trends=${includeTrends}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[AI API] Error from AI service: ${aiResponse.status}`, errorText);
      
      // AI service not available
      return NextResponse.json(
        { 
          error: 'AI service tidak tersedia',
          status: aiResponse.status,
          details: errorText || 'No details available'
        },
        { status: 503 }
      );
    }

    let data = await aiResponse.json();
    
    // Apply branch filter if needed
    if (branchFilter && data.results) {
      const originalCount = data.results.length;
      data.results = data.results.filter((item: any) => {
        // AI service returns data with Station property (case sensitive depends on sheet)
        const station = item.originalData?.Station || item.originalData?.station || item.originalData?.STATION;
        return station && String(station).trim().toLowerCase() === branchFilter?.toLowerCase();
      });
      console.log(`[AI API] Filtered results from ${originalCount} to ${data.results.length} for branch ${branchFilter}`);
      
      // Update summary if results were filtered
      if (data.summary) {
        data.summary.totalRecords = data.results.length;
      }
    }
    
    // Add metadata about the proxy
    const response = {
      ...data,
      _proxy: {
        timestamp: new Date().toISOString(),
        source: 'nextjs-api-proxy',
        ai_service_url: AI_SERVICE_URL,
        branch_filter: branchFilter
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    });

  } catch (error) {
    console.error('[AI API] Error in analyze-all route:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


