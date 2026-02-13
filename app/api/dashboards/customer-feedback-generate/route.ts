import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { generateCustomerFeedbackDashboard } from '@/lib/builder/customer-feedback-template';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySession(session);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = String(payload.role).trim().toUpperCase();
    if (role !== 'ANALYST' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: hanya Analyst dan Admin' }, { status: 403 });
    }

    const { dateFrom, dateTo } = await request.json();
    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: 'dateFrom and dateTo required' }, { status: 400 });
    }

    const dashboard = generateCustomerFeedbackDashboard(dateFrom, dateTo);
    return NextResponse.json({ dashboard });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
