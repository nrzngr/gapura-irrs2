import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { REPORT_STATUS } from '@/lib/constants/report-status';
import { reportsService } from '@/lib/services/reports-service';

// GET reports for an employee
export async function GET() {
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

        // Fetch reports from Google Sheets
        let reports = await reportsService.getReports();

        // Normalize role for consistent checking
        const role = String(payload.role).trim().toUpperCase();

        // APPLY STRICT FILTERING BASED ON ROLE
        if (role === 'CABANG' || role === 'EMPLOYEE') {
            // Employees only see their own reports
            reports = reports.filter(r => r.user_id === payload.id);
        } else if (role.startsWith('DIVISI_') || role.startsWith('PARTNER_')) {
             // Division/Partner users only see reports assigned to their division
             const division = role.split('_')[1]; // OS, OT, OP, UQ, HC, HT, etc.
             reports = reports.filter(r => r.target_division === division);
        }
        // ANALYST and SUPER_ADMIN retain full access for now (if they hit this endpoint)

        // Fetch related data from Supabase for manual join
        // We fetch all needed reference data once
        // Note: In a real app with many records, we would optimize this
        const { data: stations } = await supabase.from('stations').select('id, code, name');
        const { data: incidentTypes } = await supabase.from('incident_types').select('id, name');
        const { data: locations } = await supabase.from('locations').select('id, name, area');

        // Manual Join
        const enrichedReports = reports.map(report => {
            const station = stations?.find(s => s.id === report.station_id) || 
                            stations?.find(s => s.code === report.branch) || // Fallback to matching by code
                            stations?.find(s => s.code === report.station_code);
            
            const incidentType = incidentTypes?.find(t => t.id === report.incident_type_id);
            const location = locations?.find(l => l.id === report.location_id);
            
            // Fallback for incident type name (from CSV string if ID lookup fails)
            const incidentTypeName = incidentType?.name || report.irregularity_complain_category;

            return {
                ...report,
                stations: station ? { code: station.code, name: station.name } : null,
                incident_types: incidentTypeName ? { name: incidentTypeName } : null,
                locations: location ? { name: location.name, area: location.area } : null,
                // Ensure we return these objects as expected by frontend
                station: station ? { id: station.id, code: station.code, name: station.name } : undefined,
                incident_type: incidentTypeName ? { id: incidentType?.id || 'manual', name: incidentTypeName, default_severity: 'low' } : undefined
            };
        });

        return NextResponse.json(enrichedReports);
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

        // Get user's station and unit from their profile (Supabase)
        const { data: userData } = await supabase
            .from('users')
            .select('station_id, unit_id')
            .eq('id', payload.id)
            .single();

        // Construct report object for Google Sheets
        const reportData: any = {
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
            event_date: incident_date || null,
            incident_time: incident_time || null,
            area: area || null,
            specific_location: specific_location || null,
            category: main_category || null,
            irregularity_complain_category: sub_category || incident_type_id || null,
            immediate_action: immediate_action || null,
            priority: priority || 'medium',
            is_flight_related: is_flight_related || false,
            is_gse_related: is_gse_related || false,
            // Insert New Fields
            airlines: airline || null,
            route: route || null,
            root_caused: root_cause || null,
            action_taken: action_taken || null,
            reporter_name: reporter_name || null,
            // CSV-aligned fields
            station_code: station_code || null,
            hub: hub || null,
            jenis_maskapai: airline_type || null,
            report: report_content || description || null,
            reporting_branch: reporting_branch || null,
            week_in_month: week_in_month || null,
            reporter_email: reporter_email || null,
            form_submitted_at: form_submitted_at || null,
            form_completed_at: form_completed_at || null,
            // Ensure branch is populated if possible
            branch: station_code || null, 
        };

        const newReport = await reportsService.createReport(reportData);

        return NextResponse.json({ success: true, message: 'Laporan berhasil dikirim', data: newReport });
    } catch (error) {
        console.error('Error creating report:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}
