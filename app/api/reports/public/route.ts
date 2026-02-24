import { NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';

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

    const reportData: any = {
      reporter_email: email,
      reporter_name: body.reporter_name || 'Publik',
      title,
      description,
      location: body.location || '',
      airline: body.airline || body.airlines || '',
      flight_number: body.flight_number || '',
      date_of_event: body.date_of_event || body.incident_date || '',
      area: body.area || '',
      main_category: body.main_category || 'Irregularity',
      irregularity_complain_category: body.irregularity_complain_category || body.main_category || 'Irregularity',
      evidence_url: body.evidence_url || '',
      evidence_urls: body.evidence_urls || [],
      severity: body.severity || 'low',
      status: 'MENUNGGU_FEEDBACK',
      created_at: new Date().toISOString(),
    };

    const newReport = await reportsService.createReport(reportData);
    return NextResponse.json({ success: true, message: 'Laporan berhasil dikirim', data: newReport }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengirim laporan' }, { status: 500 });
  }
}
