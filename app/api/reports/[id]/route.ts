import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { reportsService } from '@/lib/services/reports-service';

/**
 * GET /api/reports/[id]
 * Fetch a single report by ID with all related data
 * Complexity: Time O(1) | Space O(1)
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifySession(token);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        // Fetch report from Google Sheets
        const report = await reportsService.getReportById(id);

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Fetch related data from Supabase for manual join
        let user = null;
        if (report.user_id) {
            const { data: u } = await supabase.from('users').select('id, full_name, email').eq('id', report.user_id).single();
            user = u;
        }

        let station = null;
        // Try to match station by ID, then code (branch)
        if (report.station_id) {
             const { data: s } = await supabase.from('stations').select('id, code, name').eq('id', report.station_id).single();
             station = s;
        } else if (report.branch || report.station_code) {
             const code = report.branch || report.station_code;
             const { data: s } = await supabase.from('stations').select('id, code, name').eq('code', code).single();
             station = s;
        }

        // Enrich report
        const enrichedReport = {
            ...report,
            users: user || (report.reporter_name ? { full_name: report.reporter_name } : null),
            stations: station || (report.branch ? { code: report.branch, name: report.branch } : null),
            // Legacy / Frontend compatibility
            user: user || (report.reporter_name ? { full_name: report.reporter_name } : null),
            station: station || (report.branch ? { code: report.branch, name: report.branch } : null),
        };

        // Try to fetch comments from Supabase (might return empty if no relation exists)
        // Note: This relies on report_id existing in Supabase or not being enforced for SELECT
        const { data: comments, error: commentsError } = await supabaseAdmin
            .from('report_comments')
            .select(`
                id,
                content,
                attachments,
                is_system_message,
                created_at,
                users:user_id (
                    id,
                    full_name,
                    role,
                    division
                )
            `)
            .eq('report_id', id)
            .order('created_at', { ascending: true });
            
        if (commentsError) {
            console.error('[DEBUG_API] Error fetching comments with admin:', commentsError);
        }

        // @ts-ignore
        enrichedReport.comments = comments || [];

        return NextResponse.json(enrichedReport);
    } catch (error) {
        console.error('Error in GET /api/reports/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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
        
        // Define allowed fields to update
        const {
            title,
            description,
            severity,
            status,
            evidence_urls,
            flight_number,
            aircraft_reg,
            gse_number,
            category,
            priority,
            location,
            station_id,
            // Add other fields that might be updated
            action_taken,
            root_cause,
        } = body;

        const updates: any = {};

        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (severity !== undefined) updates.severity = severity;
        if (status !== undefined) updates.status = status;
        if (evidence_urls !== undefined) updates.evidence_urls = evidence_urls;
        if (flight_number !== undefined) updates.flight_number = flight_number;
        if (aircraft_reg !== undefined) updates.aircraft_reg = aircraft_reg;
        if (gse_number !== undefined) updates.gse_number = gse_number;
        if (category !== undefined) updates.category = category;
        if (priority !== undefined) updates.priority = priority;
        if (location !== undefined) updates.location = location;
        if (station_id !== undefined) updates.station_id = station_id;
        if (action_taken !== undefined) updates.action_taken = action_taken;
        if (root_cause !== undefined) updates.root_caused = root_cause;

        const updatedReport = await reportsService.updateReport(id, updates);

        if (!updatedReport) {
             return NextResponse.json({ error: 'Report not found or update failed' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedReport });
    } catch (error) {
        console.error('Error updating report:', error);
        return NextResponse.json({ error: 'Gagal mengupdate laporan' }, { status: 500 });
    }
}
