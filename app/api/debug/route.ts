import { NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';

export async function GET() {
    console.log('[DEBUG_API] Calling reportsService.getReports()...');
    try {
        const reports = await reportsService.getReports({ refresh: true });
        console.log('[DEBUG_API] Success! Found', reports.length, 'reports');
        return NextResponse.json({ success: true, count: reports.length, sample: reports[0] || null });
    } catch (error: any) {
        console.error('[DEBUG_API] Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message, 
            stack: error.stack 
        }, { status: 500 });
    }
}
