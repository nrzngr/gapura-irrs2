import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { readFile } from 'fs/promises';
import path from 'path';

export const maxDuration = 300; // 5 minutes

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

    // Allow all authenticated roles to access AI analysis
    const role = String(payload.role).trim().toUpperCase();

    // Get branch filter for MANAGER_CABANG
    const branchFilter: string | null = null;
    let branchCode: string | null = null;
    if (role === 'MANAGER_CABANG') {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('station_id')
        .eq('id', payload.id)
        .single();
      
      if (userData?.station_id) {
        branchCode = String(userData.station_id);
        console.log(`[AI API] Applying branch code for MANAGER_CABANG: ${branchCode}`);
      }
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const maxRows = searchParams.get('max_rows_per_sheet') || '10000';
    const bypassCache = searchParams.get('bypass_cache') || 'false';
    const includeRegression = searchParams.get('include_regression') || 'true';
    const includeNlp = searchParams.get('include_nlp') || 'true';
    const includeTrends = searchParams.get('include_trends') || 'true';
    const source = searchParams.get('source');
    const excludeClosed = (searchParams.get('exclude_closed') || 'false').toLowerCase() === 'true';

    type OriginalData = {
      station_code?: string;
      branch?: string;
      Station?: string;
      station?: string;
      STATION?: string;
      status?: string;
      Status?: string;
      STATUS?: string;
    };
    type AnalysisItem = { originalData?: OriginalData };

    // Serve from local sample file if explicitly requested
    if (source && source.toLowerCase() === 'local') {
      try {
        const filePath = path.join(process.cwd(), 'analyze-all.json');
        const fileContent = await readFile(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        if (data.results) {
          const originalCount = data.results.length;
          data.results = data.results.filter((item: AnalysisItem) => {
            const code = item.originalData?.station_code || item.originalData?.branch;
            const station = item.originalData?.Station || item.originalData?.station || item.originalData?.STATION;
            const branchOk = branchCode
              ? (code ? String(code).trim().toLowerCase() === branchCode?.toLowerCase() : true)
              : (branchFilter
                  ? (station ? String(station).trim().toLowerCase() === branchFilter?.toLowerCase() : true)
                  : true);
            const statusVal = item.originalData?.status || item.originalData?.Status || item.originalData?.STATUS;
            const statusOk = excludeClosed ? String(statusVal || '').toLowerCase() !== 'closed' : true;
            return branchOk && statusOk;
          });
          console.log(`[AI API] [LOCAL] Filtered results from ${originalCount} to ${data.results.length} for branch code ${branchCode || '-'} name ${branchFilter || '-'}`);
          if (data.summary) {
            data.summary.totalRecords = data.results.length;
          }
        }

        const response = {
          ...data,
          _proxy: {
            timestamp: new Date().toISOString(),
            source: 'local-file',
            ai_service_url: 'local',
            branch_filter: branchCode || branchFilter
          },
          _pagination: null
        };

        return NextResponse.json(response, {
          headers: {
            'Cache-Control': 'no-store'
          }
        });
      } catch (e) {
        console.error('[AI API] Failed to read local analyze-all.json:', e);
        // fall through to remote call
      }
    }

    // Call the Python AI service
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://ridzki-nrzngr-gapura-ai.hf.space';
    
    console.log(`[AI API] Calling analyze-all with max_rows=${maxRows}`);
    
    const branchQuery = branchCode ? `&branch=${encodeURIComponent(branchCode)}` : '';
    const aiResponse = await fetch(
      `${AI_SERVICE_URL}/api/ai/analyze-all?max_rows_per_sheet=${maxRows}&bypass_cache=${bypassCache}&include_regression=${includeRegression}&include_nlp=${includeNlp}&include_trends=${includeTrends}&exclude_closed=${excludeClosed}${branchQuery}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text().catch(() => '');
      console.error(`[AI API] Error from AI service: ${aiResponse.status}`, errorText);
      
      // Attempt local fallback
      try {
        const filePath = path.join(process.cwd(), 'analyze-all.json');
        const fileContent = await readFile(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        if (data.results) {
          const originalCount = data.results.length;
          data.results = data.results.filter((item: AnalysisItem) => {
            const code = item.originalData?.station_code || item.originalData?.branch;
            const station = item.originalData?.Station || item.originalData?.station || item.originalData?.STATION;
            const branchOk = branchCode
              ? (code ? String(code).trim().toLowerCase() === branchCode?.toLowerCase() : true)
              : (branchFilter
                  ? (station ? String(station).trim().toLowerCase() === branchFilter?.toLowerCase() : true)
                  : true);
            const statusVal = item.originalData?.status || item.originalData?.Status || item.originalData?.STATUS;
            const statusOk = excludeClosed ? String(statusVal || '').toLowerCase() !== 'closed' : true;
            return branchOk && statusOk;
          });
          console.log(`[AI API] [LOCAL-FB] Filtered results from ${originalCount} to ${data.results.length} for branch code ${branchCode || '-'} name ${branchFilter || '-'}`);
          if (data.summary) {
            data.summary.totalRecords = data.results.length;
          }
        }

        const response = {
          ...data,
          _proxy: {
            timestamp: new Date().toISOString(),
            source: 'local-file-fallback',
            ai_service_url: process.env.AI_SERVICE_URL || 'https://ridzki-nrzngr-gapura-ai.hf.space',
            branch_filter: branchCode || branchFilter
          },
          _pagination: null
        };

        return NextResponse.json(response, {
          headers: {
            'Cache-Control': 'no-store'
          }
        });
      } catch (fallbackErr) {
        console.error('[AI API] Local fallback failed:', fallbackErr);
        return NextResponse.json(
          { 
            error: 'AI service tidak tersedia',
            status: aiResponse.status,
            details: errorText || 'No details available'
          },
          { status: 503 }
        );
      }
    }

    const data = await aiResponse.json();
    
    if (data.results) {
      const originalCount = data.results.length;
      data.results = data.results.filter((item: AnalysisItem) => {
        const code = item.originalData?.station_code || item.originalData?.branch;
        const station = item.originalData?.Station || item.originalData?.station || item.originalData?.STATION;
        const branchOk = branchCode
          ? (code ? String(code).trim().toLowerCase() === branchCode?.toLowerCase() : true)
          : (branchFilter
              ? (station ? String(station).trim().toLowerCase() === branchFilter?.toLowerCase() : true)
              : true);
        const statusVal = item.originalData?.status || item.originalData?.Status || item.originalData?.STATUS;
        const statusOk = excludeClosed ? String(statusVal || '').toLowerCase() !== 'closed' : true;
        return branchOk && statusOk;
      });
      console.log(`[AI API] Filtered results from ${originalCount} to ${data.results.length} for branch code ${branchCode || '-'} name ${branchFilter || '-'}`);
      if (data.summary) {
        data.summary.totalRecords = data.results.length;
      }
    }
    
    
    
    const response = {
      ...data,
      _proxy: {
        timestamp: new Date().toISOString(),
        source: 'nextjs-api-proxy',
        ai_service_url: AI_SERVICE_URL,
        branch_filter: branchCode || branchFilter
      },
      _pagination: null
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
