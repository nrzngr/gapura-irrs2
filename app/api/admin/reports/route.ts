import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateStatusTransition, getTimestampFieldForStatus, getUserFieldForStatus } from '@/lib/utils/validate-transition';

// GET all reports (for admin)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const station = searchParams.get('station');
        const search = searchParams.get('search');
        const severity = searchParams.get('severity');
        const mainCategory = searchParams.get('main_category');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const targetDivision = searchParams.get('target_division');

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

        if (severity && severity !== 'all') {
            query = query.eq('severity', severity);
        }

        if (mainCategory && mainCategory !== 'all') {
            query = query.eq('main_category', mainCategory);
        }

        if (from) {
            query = query.gte('created_at', from);
        }

        if (to) {
            query = query.lte('created_at', to);
        }

        if (targetDivision && targetDivision !== 'all') {
            query = query.eq('target_division', targetDivision);
        }

        // Search by case number / title / reference_number / flight_number
        if (search) {
            query = query.or(`title.ilike.%${search}%,reference_number.ilike.%${search}%,flight_number.ilike.%${search}%`);
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
        const { reportId, action, userId, notes, resolution_evidence_url } = body;

        if (!reportId || !action) {
            return NextResponse.json({ error: 'reportId dan action wajib diisi' }, { status: 400 });
        }

        // Get current report
        const { data: report, error: fetchError } = await supabase
            .from('reports')
            .select('status')
            .eq('id', reportId)
            .single();

        if (fetchError || !report) {
            return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 });
        }

        // Get user role
        let userRole = body.userRole;
        if (!userRole && userId) {
            const { data: user } = await supabase
                .from('users')
                .select('role')
                .eq('id', userId)
                .single();
            userRole = user?.role;
        }

        if (!userRole) {
            return NextResponse.json({ error: 'Role pengguna tidak ditemukan' }, { status: 400 });
        }

        // Validate transition
        const validation = validateStatusTransition(report.status, action, userRole);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 403 });
        }

        const newStatus = validation.newStatus!;
        const updateData: Record<string, unknown> = {
            status: newStatus,
            updated_at: new Date().toISOString(),
        };

        // Set timestamp field for the transition
        const timestampField = getTimestampFieldForStatus(newStatus);
        if (timestampField) {
            updateData[timestampField] = new Date().toISOString();
        }

        // Set user field for the transition
        const userField = getUserFieldForStatus(newStatus);
        if (userField && userId) {
            updateData[userField] = userId;
        }

        // Add notes if provided
        if (notes) {
            if (action === 'verify') {
                updateData.validation_notes = notes;
            } else if (action === 'close') {
                updateData.investigator_notes = notes;
            } else if (action === 'reopen') {
                updateData.manager_notes = notes;
            }
        }

        // Add resolution evidence URL if provided
        if (resolution_evidence_url) {
            updateData.resolution_evidence_url = resolution_evidence_url;
        }

        // If reopening, clear resolved timestamps
        if (action === 'reopen') {
            updateData.resolved_at = null;
            updateData.resolved_by = null;
        }

        const { error } = await supabase
            .from('reports')
            .update(updateData)
            .eq('id', reportId);

        if (error) throw error;

        return NextResponse.json({ success: true, newStatus });
    } catch (error) {
        console.error('Error updating report:', error);
        return NextResponse.json({ error: 'Gagal mengubah status' }, { status: 500 });
    }
}
