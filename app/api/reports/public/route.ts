import { NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.reporter_email || '').trim();
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email tidak valid' }, { status: 400 });
    }
    if (!title || !description) {
      return NextResponse.json({ error: 'Judul dan deskripsi wajib diisi' }, { status: 400 });
    }

    const {
      station_id,
      station_code,
      hub,
      jenis_maskapai,
      route,
      delay_code,
      delay_duration,
      area,
      incident_type_id,
      terminal_area_category,
      apron_area_category,
      general_category,
      week_in_month,
      form_submitted_at,
      form_completed_at,
      evidence_url,
      evidence_urls,
      severity,
    } = body;

    const reportData: any = {
      reporter_email: email,
      reporter_name: body.reporter_name || email,
      title,
      description,
      location: body.location || '',
      airlines: body.airline || body.airlines || '',
      flight_number: body.flight_number || '',
      date_of_event: body.date_of_event || body.incident_date || '',
      area: area || '',
      category: body.main_category || 'Irregularity',
      irregularity_complain_category: incident_type_id || body.main_category || 'Irregularity',
      evidence_url: evidence_url || (Array.isArray(evidence_urls) && evidence_urls[0]) || '',
      evidence_urls: Array.isArray(evidence_urls) ? evidence_urls : (evidence_url ? [evidence_url] : []),
      severity: severity || 'low',
      status: 'OPEN',
      created_at: new Date().toISOString(),
      // CSV-aligned / derived fields
      station_id: station_id || null,
      station_code: station_code || station_id || null,
      hub: hub || null,
      jenis_maskapai: jenis_maskapai || null,
      route: route || null,
      delay_code: delay_code || null,
      delay_duration: delay_duration || null,
      incident_type_id: incident_type_id || null,
      terminal_area_category: terminal_area_category || null,
      apron_area_category: apron_area_category || null,
      general_category: general_category || null,
      week_in_month: week_in_month || null,
      report: body.report || description,
      reporting_branch: body.reporting_branch || station_code || station_id || null,
      form_submitted_at: form_submitted_at || new Date().toISOString(),
      form_completed_at: form_completed_at || new Date().toISOString(),
    };

    const newReport = await reportsService.createReport(reportData);

    // Best-effort metadata persistence to Supabase for mapping & audit
    // Uses Admin client to avoid unauthorized issues on public route
    try {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('[Public Report] SUPABASE_SERVICE_ROLE_KEY not set, skipping metadata insert');
      } else {
        const sheetId = (newReport as any).original_id || newReport.id;
        const { error: insertErr } = await supabaseAdmin
          .from('reports')
          .insert({
            // Do not set id explicitly to keep DB defaults unless required
            sheet_id: sheetId,
            title: newReport.title,
            description: newReport.description,
            reporter_name: newReport.reporter_name || body.reporter_name || null,
            reporter_email: newReport.reporter_email || body.reporter_email || null,
            status: newReport.status || 'OPEN',
            severity: newReport.severity || 'low',
            date_of_event: newReport.date_of_event || null,
            created_at: newReport.created_at || new Date().toISOString(),
            updated_at: newReport.updated_at || new Date().toISOString(),
            // Helpful context
            station_id: newReport.station_code || newReport.station_id || null,
            airlines: newReport.airlines || newReport.airline || null,
            flight_number: newReport.flight_number || null,
            category: newReport.category || newReport.main_category || null,
          });
        if (insertErr) {
          console.warn('[Public Report] Supabase metadata insert failed (non-blocking):', insertErr.message);
        }
      }
    } catch (e) {
      console.warn('[Public Report] Supabase metadata insert error (non-blocking):', e);
    }

    return NextResponse.json({ success: true, message: 'Laporan berhasil dikirim', data: newReport }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengirim laporan' }, { status: 500 });
  }
}
