import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateStatusTransition, getTimestampFieldForStatus, getUserFieldForStatus } from '@/lib/utils/validate-transition';
import { reportsService } from '@/lib/services/reports-service';

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

        // Fetch all reports from Google Sheets
        const reports = await reportsService.getReports();

        // Fetch related data from Supabase for manual join
        const { data: stations } = await supabase.from('stations').select('id, code, name');
        const { data: users } = await supabase.from('users').select('id, full_name, email');
        
        // Enrich reports
        const enrichedReports = reports.map(report => {
            const stationObj = stations?.find(s => s.id === report.station_id) || 
                               stations?.find(s => s.code === report.branch) || 
                               stations?.find(s => s.code === report.station_code);
            
            const userObj = users?.find(u => u.id === report.user_id);

            return {
                ...report,
                stations: stationObj ? { code: stationObj.code, name: stationObj.name } : null,
                users: userObj ? { full_name: userObj.full_name, email: userObj.email } : null,
                // Ensure station_id is populated for filtering if it was missing but matched by code
                station_id: report.station_id || stationObj?.id
            };
        });

        // Apply Filters
        let filteredData = enrichedReports;

        if (status && status !== 'all') {
            filteredData = filteredData.filter(r => r.status === status);
        }

        if (station && station !== 'all') {
            // station filter is likely an ID from frontend dropdown
            filteredData = filteredData.filter(r => r.station_id === station);
        }

        if (severity && severity !== 'all') {
            filteredData = filteredData.filter(r => r.severity === severity);
        }

        if (mainCategory && mainCategory !== 'all') {
             // 'category' in Sheet mapped to 'category' in Report
            filteredData = filteredData.filter(r => r.category === mainCategory);
        }

        if (from) {
            const fromDate = new Date(from).getTime();
            filteredData = filteredData.filter(r => new Date(r.created_at).getTime() >= fromDate);
        }

        if (to) {
            const toDate = new Date(to).getTime();
            filteredData = filteredData.filter(r => new Date(r.created_at).getTime() <= toDate);
        }

        // target_division might not be in Sheet?
        // if (targetDivision && targetDivision !== 'all') {
        //    filteredData = filteredData.filter(r => r.target_division === targetDivision);
        // }

        // Search by case number / title / reference_number / flight_number
        if (search) {
            const searchLower = search.toLowerCase();
            filteredData = filteredData.filter(r => 
                (r.title || '').toLowerCase().includes(searchLower) ||
                (r.reference_number || '').toLowerCase().includes(searchLower) ||
                (r.flight_number || '').toLowerCase().includes(searchLower) ||
                (r.description || '').toLowerCase().includes(searchLower) ||
                (r.reporter_name || '').toLowerCase().includes(searchLower) ||
                (r.users?.full_name || '').toLowerCase().includes(searchLower)
            );
        }

        return NextResponse.json(filteredData);
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
        const report = await reportsService.getReportById(reportId);

        if (!report) {
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
        const updateData: any = {
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

        const updatedReport = await reportsService.updateReport(reportId, updateData);

        if (!updatedReport) {
             return NextResponse.json({ error: 'Gagal mengupdate laporan' }, { status: 500 });
        }

        return NextResponse.json({ success: true, newStatus });
    } catch (error) {
        console.error('Error updating report:', error);
        return NextResponse.json({ error: 'Gagal mengubah status' }, { status: 500 });
    }
}
