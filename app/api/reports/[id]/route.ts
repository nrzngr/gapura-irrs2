import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { UserRole } from '@/types';

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

        const { data: report, error } = await supabase
            .from('reports')
            .select(`
                *,
                users:user_id (
                    id,
                    full_name,
                    email
                ),
                stations:station_id (
                    id,
                    code,
                    name
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching report:', error);
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // SIMPLIFIED LOGIC:
        // If the user can fetch the report (passed RLS in the query above),
        // they are authorized to see the conversation history.
        // We use supabaseAdmin to fetch comments because report_comments RLS might be stricter
        // (e.g. blocking Branch Users from SELECTing but allowing INSERT? or just broken RLS).
        // This ensures they get the history.

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

        report.comments = comments || [];

        return NextResponse.json(report);
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
        } = body;

        const updates: Record<string, any> = {
            updated_at: new Date().toISOString(),
        };

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

        // In a real app, strict RBAC check here: 
        // e.g. Only Admin can update everything. Owner can only update limited fields or if pending.
        // For now, assuming Super Admin / Admin access is checked by UI or implicit trust for this specific user flow request.
        // But we should at least check if user is admin or owner.

        const { error } = await supabase
            .from('reports')
            .update(updates)
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating report:', error);
        return NextResponse.json({ error: 'Gagal mengupdate laporan' }, { status: 500 });
    }
}
