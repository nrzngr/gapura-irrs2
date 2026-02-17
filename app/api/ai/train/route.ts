import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';

/**
 * POST /api/ai/train
 * 
 * Trigger model retraining
 */
export async function POST(request: NextRequest) {
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
    const force = searchParams.get('force') || 'false';

    // Call the Python AI service
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    try {
      const aiResponse = await fetch(`${AI_SERVICE_URL}/api/ai/train?force=${force}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!aiResponse.ok) {
        throw new Error(`AI service returned ${aiResponse.status}`);
      }

      const data = await aiResponse.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('[AI Train] AI service unavailable:', error);
      
      // Return error - no mock data
      return NextResponse.json(
        { 
          error: 'AI service tidak tersedia',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('[AI Train] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
