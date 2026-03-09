import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { reportsService } from '@/lib/services/reports-service';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifySession(token);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        const body = await request.json();
        const { reports } = body;

        if (!Array.isArray(reports) || reports.length === 0) {
            return NextResponse.json({ error: 'Data laporan tidak valid' }, { status: 400 });
        }

        // Add user_id to each report for traceability
        const processedReports = reports.map(r => ({
            ...r,
            user_id: payload.id
        }));

        const success = await reportsService.batchCreateReports(processedReports);

        if (!success) {
            throw new Error('Failed to create reports in Google Sheets');
        }

        return NextResponse.json({ 
            success: true, 
            message: `${reports.length} laporan berhasil diimport ke Google Sheets`,
            count: reports.length
        });
    } catch (error) {
        console.error('Error in batch import:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan saat batch import' }, { status: 500 });
    }
}
