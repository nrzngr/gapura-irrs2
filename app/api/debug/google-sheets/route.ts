import { NextRequest, NextResponse } from 'next/server';
import { fetchGoogleSheetsSampleData, debugColumnData } from '@/lib/debug/google-sheets-debug';

/**
 * API route to debug Google Sheets data
 * GET /api/debug/google-sheets?sheet=NON CARGO&limit=10
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get('sheet') || 'NON CARGO';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const columnName = searchParams.get('column');
    
    // If column parameter provided, debug specific column
    if (columnName) {
      const result = await debugColumnData(sheetName, columnName);
      return NextResponse.json(result);
    }
    
    // Otherwise fetch general sample data
    const result = await fetchGoogleSheetsSampleData(sheetName, limit);
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error in debug API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
