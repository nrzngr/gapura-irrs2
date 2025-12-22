import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET all reports (for admin)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const station = searchParams.get('station');

        let query = supabase
            .from('reports')
            .select(`
        *,
        users:user_id (
          full_name,
          email
        ),
        stations:station_id (
          code,
          name
        )
      `)
            .order('created_at', { ascending: false });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        if (station && station !== 'all') {
            query = query.eq('station_id', station);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching reports:', error);
        return NextResponse.json({ error: 'Gagal memuat laporan' }, { status: 500 });
    }
}

// PATCH to update report status
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { reportId, status, notes, resolution_evidence_url } = body;

        // Valid statuses from the workflow
        const validStatuses = ['OPEN', 'ACKNOWLEDGED', 'ON_PROGRESS', 'WAITING_VALIDATION', 'CLOSED', 'RETURNED', 'pending', 'reviewed', 'resolved'];

        if (!reportId || !validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
        }

        const updateData: Record<string, any> = { 
            status, 
            updated_at: new Date().toISOString() 
        };

        // Add notes if provided
        if (notes) {
            updateData.resolution_notes = notes;
        }

        // Add resolution evidence URL if provided (required for CLOSED status)
        if (resolution_evidence_url) {
            updateData.resolution_evidence_url = resolution_evidence_url;
        }

        // If closing, set resolved_at timestamp
        if (status === 'CLOSED') {
            updateData.resolved_at = new Date().toISOString();
        }

        const { error } = await supabase
            .from('reports')
            .update(updateData)
            .eq('id', reportId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating report:', error);
        return NextResponse.json({ error: 'Gagal mengubah status' }, { status: 500 });
    }
}
