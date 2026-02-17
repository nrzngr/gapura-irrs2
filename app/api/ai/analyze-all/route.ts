import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';

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

    // Only allow analysts and admins
    const role = String(payload.role).trim().toUpperCase();
    if (role !== 'ANALYST' && role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Analyst or Admin access required' },
        { status: 403 }
      );
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

    const data = await aiResponse.json();
    
    // Add metadata about the proxy
    const response = {
      ...data,
      _proxy: {
        timestamp: new Date().toISOString(),
        source: 'nextjs-api-proxy',
        ai_service_url: AI_SERVICE_URL,
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


