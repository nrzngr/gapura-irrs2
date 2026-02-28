import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { REPORT_STATUS } from '@/lib/constants/report-status';
import { reportsService } from '@/lib/services/reports-service';

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

        // Fetch reports from Google Sheets
        let reports: any[] = [];
        try {
            reports = await reportsService.getReports();
            console.log(`[REPORTS_API] Fetched ${reports?.length} raw reports`);
            
            // DEBUG: Log first report to check user_id presence
            if (reports.length > 0) {
                const firstReport = reports[0];
                console.log('[REPORTS_API] First report sample:', {
                    id: firstReport.id,
                    title: firstReport.title,
                    user_id: firstReport.user_id,
                    sheet_id: firstReport.sheet_id
                });
            }
        } catch (srvErr: any) {
            console.error('[REPORTS_API] Service error:', srvErr.message);
            throw srvErr;
        }

        // Normalize role for consistent checking
        const role = String(payload.role).trim().toUpperCase();
        const url = new URL(request.url);
        const unfiltered = url.searchParams.get('unfiltered') === '1';

        // Get user's station_id from database for role-based filtering
        const { data: userData } = await supabase
            .from('users')
            .select('station_id')
            .eq('id', payload.id)
            .single();

        const userStationId = userData?.station_id;

        const isDivisionOrPartner = role.startsWith('DIVISI_') || role.startsWith('PARTNER_');
        const adminBypass = role === 'SUPER_ADMIN' || role === 'ANALYST';
        const bypassFiltering = unfiltered && (isDivisionOrPartner || adminBypass);

        if (bypassFiltering) {
            console.log(`[REPORTS_API] Unfiltered mode active for role: ${role}`);
        } else {
            // APPLY STRICT FILTERING BASED ON ROLE
            console.log(`[REPORTS_API] Filtering for role: ${role}, user_id: ${payload.id}, station_id: ${userStationId}`);

            if (role === 'STAFF_CABANG') {
                const originalCount = reports.length;
                reports = reports.filter(r => r.user_id === payload.id);
                console.log(`[REPORTS_API] STAFF_CABANG filtered reports from ${originalCount} to ${reports.length} for user ${payload.id}`);
            } else if (role === 'MANAGER_CABANG' && userStationId) {
                const originalCount = reports.length;
                reports = reports.filter(r => r.station_id === userStationId);
                console.log(`[REPORTS_API] MANAGER_CABANG filtered reports from ${originalCount} to ${reports.length} for station ${userStationId}`);
            } else if (role === 'CABANG' || role === 'EMPLOYEE') {
                const originalCount = reports.length;
                reports = reports.filter(r => r.user_id === payload.id);
                console.log(`[REPORTS_API] ${role} filtered reports from ${originalCount} to ${reports.length} for user ${payload.id}`);
            } else if (isDivisionOrPartner) {
                const division = role.split('_')[1];
                reports = reports.filter(r => r.target_division === division);
            }
            // ANALYST and SUPER_ADMIN retain full access for now
        }

        // ReportsService already handles basic enrichment (stations, categories) from Sheet data
        const enrichedReports = (reports || []).map(report => {
            if (!report) return null;
            return {
                ...report,
                // Ensure compatibility with frontend expectations if needed
                station: report.stations ? { ...report.stations, id: report.station_id } : undefined,
                incident_type: report.category ? { id: 'manual', name: report.category } : undefined
            };
        }).filter(Boolean);

        console.log(`[REPORTS_API] Returning ${enrichedReports.length} enriched reports`);
        return NextResponse.json(enrichedReports, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
                'Vary': 'Cookie'
            }
        });
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
            // Delay fields
            delay_code,
            delay_duration,
            // CSV-aligned fields
            station_code,
            hub,
            airline_type,
            jenis_maskapai, // from client wizard
            report_content,
            reporting_branch,
            week_in_month,
            reporter_email,
            form_submitted_at,
            form_completed_at,
            // Area-specific category columns (from client wizard)
            terminal_area_category,
            apron_area_category,
            general_category,
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
            // Sheets expect "date_of_event" header, map from incident_date
            date_of_event: incident_date || null,
            event_date: incident_date || null, // keep legacy alias for compatibility
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
            delay_code: delay_code || null,
            delay_duration: delay_duration || null,
            // CSV-aligned fields
            station_code: station_code || null,
            hub: hub || null,
            // Support both airline_type and jenis_maskapai from client
            jenis_maskapai: airline_type || jenis_maskapai || null,
            report: report_content || description || null,
            reporting_branch: reporting_branch || station_code || null,
            week_in_month: week_in_month || null,
            reporter_email: reporter_email || null,
            form_submitted_at: form_submitted_at || null,
            form_completed_at: form_completed_at || null,
            // Ensure branch is populated if possible
            branch: station_code || null, 
            // Area-specific categories (ensure write to appropriate columns)
            terminal_area_category: terminal_area_category || (area === 'TERMINAL' ? area_category || null : null),
            apron_area_category: apron_area_category || (area === 'APRON' ? area_category || null : null),
            general_category: general_category || ((area === 'GENERAL' || area === 'CARGO') ? area_category || null : null),
        };

        const newReport = await reportsService.createReport(reportData);

        // Attempt to sync to Supabase (Best Effort for Tracking)
        try {
            // We map the fields to match the database schema as closely as possible
            // Note: If the table 'reports' does not exist or has different schema, this will fail gracefully
            const { error: sbError } = await supabase.from('reports').insert({
                user_id: payload.id,
                title: newReport.title,
                description: newReport.description,
                status: newReport.status,
                severity: newReport.severity,
                location: newReport.location,
                flight_number: newReport.flight_number,
                aircraft_reg: newReport.aircraft_reg,
                date_of_event: newReport.date_of_event,
                station_id: newReport.station_id,
                incident_type_id: newReport.incident_type_id,
                
                // Store Google Sheet ID for reference
                sheet_id: (newReport as any).original_id || newReport.id, 
                
                // Additional fields
                reporter_name: newReport.reporter_name,
                action_taken: newReport.action_taken,
                root_caused: newReport.root_caused,
                delay_code: newReport.delay_code,
                delay_duration: newReport.delay_duration,
                
                created_at: newReport.created_at,
                updated_at: newReport.updated_at
            });

            if (sbError) {
                console.warn('[Supabase] Sync failed (non-blocking):', sbError.message);
            } else {
                console.log('[Supabase] Report synced successfully');
            }
        } catch (err) {
            console.warn('[Supabase] Sync error:', err);
        }

        return NextResponse.json({ success: true, message: 'Laporan berhasil dikirim', data: newReport });
    } catch (error) {
        console.error('Error creating report:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
    }
}
