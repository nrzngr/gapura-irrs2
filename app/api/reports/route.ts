import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { REPORT_STATUS } from '@/lib/constants/report-status';

// GET reports for an employee
export async function GET(request: Request) {
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

        const { data, error } = await supabase
            .from('reports')
            .select(`
        *,
        incident_types:incident_type_id (name),
        stations:station_id (code, name),
        locations:location_id (name, area)
      `)
            .eq('user_id', payload.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching reports:', error);
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }
}

// POST create a new report
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
        const {
            title,
            description,
            location,
            station_id,
            location_id,
            incident_type_id,
            severity,
            flight_number,
            aircraft_reg,
            gse_number,
            evidence_url,
            evidence_urls,
            evidence_meta,
            // New fields
            incident_date,
            incident_time,
            area,
            specific_location,
            main_category,
            sub_category,
            immediate_action,
            priority,
            is_flight_related,
            is_gse_related,
            // New Screenshot Fields
            airline,
            route,
            root_cause,
            action_taken,
            reporter_name,
            area_category,
            // CSV-aligned fields
            station_code,
            hub,
            airline_type,
            report_content,
            reporting_branch,
            week_in_month,
            reporter_email,
            form_submitted_at,
            form_completed_at,
        } = body;

        if (!title || !description) {
            return NextResponse.json({ error: 'Judul dan deskripsi wajib diisi' }, { status: 400 });
        }

        // Get user's station and unit from their profile
        const { data: userData } = await supabase
            .from('users')
            .select('station_id, unit_id')
            .eq('id', payload.id)
            .single();

        const { error: insertError } = await supabase
            .from('reports')
            .insert({
                user_id: payload.id,
                title,
                description,
                location: location || null,
                station_id: station_id || userData?.station_id || null,
                unit_id: userData?.unit_id || null,
                location_id: location_id || null,
                incident_type_id: incident_type_id || null,
                severity: severity || 'low',
                flight_number: flight_number || null,
                aircraft_reg: aircraft_reg || null,
                gse_number: gse_number || null,
                evidence_url: evidence_url || (evidence_urls && evidence_urls.length > 0 ? evidence_urls[0] : null),
                evidence_urls: evidence_urls || (evidence_url ? [evidence_url] : []) || [],
                evidence_meta: evidence_meta || null,
                status: REPORT_STATUS.MENUNGGU_FEEDBACK,
                // Insert new fields
                incident_date: incident_date || null,
                incident_time: incident_time || null,
                area: area || null,
                specific_location: specific_location || null,
                main_category: main_category || null,
                sub_category: sub_category || null,
                immediate_action: immediate_action || null,
                priority: priority || 'medium', // Default to medium if not provided
                is_flight_related: is_flight_related || false,
                is_gse_related: is_gse_related || false,
                // Insert New Fields
                airline: airline || null,
                route: route || null,
                root_cause: root_cause || null,
                action_taken: action_taken || null,
                reporter_name: reporter_name || null,
                area_category: area_category || null,
                category: main_category || null,
                // CSV-aligned fields
                station_code: station_code || null,
                hub: hub || null,
                airline_type: airline_type || null,
                report_content: report_content || description || null,
                reporting_branch: reporting_branch || null,
                week_in_month: week_in_month || null,
                reporter_email: reporter_email || null,
                form_submitted_at: form_submitted_at || null,
                form_completed_at: form_completed_at || null,
            });

        if (insertError) {
            console.error('Insert error:', insertError);
            return NextResponse.json({ error: 'Gagal menyimpan laporan' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Laporan berhasil dikirim' });
    } catch (error) {
        console.error('Error creating report:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}
