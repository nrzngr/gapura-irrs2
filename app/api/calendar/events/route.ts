import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { CalendarEvent } from '@/types';

/**
 * GET /api/calendar/events
 * Fetch calendar events with optional filters
 * Auth: ANALYST or DIVISI_OS roles only
 */
export async function GET(request: Request) {
  try {
    // 1. Authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySession(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // 2. Authorization - Check role
    const role = String(payload.role).trim().toUpperCase();
    if (role !== 'ANALYST' && role !== 'DIVISI_OS') {
      return NextResponse.json(
        { error: 'Forbidden: Access limited to ANALYST and DIVISI_OS roles' },
        { status: 403 }
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const created_by = searchParams.get('created_by');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    // 4. Build database query
    let query = supabaseAdmin
      .from('calendar_events')
      .select(`
        *,
        users:created_by (
          full_name
        )
      `)
      .is('deleted_at', null)
      .order('event_date', { ascending: true });

    // Apply filters
    if (search) {
      // Case-insensitive search in title and notes
      query = query.or(`title.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    if (created_by) {
      query = query.eq('created_by', created_by);
    }

    if (start_date) {
      query = query.gte('event_date', start_date);
    }

    if (end_date) {
      query = query.lte('event_date', end_date);
    }

    // 5. Execute query
    const { data, error } = await query;

    if (error) {
      console.error('[CALENDAR_API] Error fetching events:', error);
      throw error;
    }

    // 6. Map response to CalendarEvent format
    const events: CalendarEvent[] = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      event_date: row.event_date,
      event_time: row.event_time,
      notes: row.notes,
      meeting_minutes_link: row.meeting_minutes_link,
      calendar_type: row.calendar_type || 'event',
      is_recurring: row.is_recurring,
      recurrence_pattern: row.recurrence_pattern,
      recurrence_end_date: row.recurrence_end_date,
      parent_event_id: row.parent_event_id,
      created_by: row.created_by,
      created_by_name: row.users?.full_name || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
    }));

    console.log(`[CALENDAR_API] Returning ${events.length} events`);
    return NextResponse.json(events);
  } catch (error) {
    console.error('[CALENDAR_API] Error in GET /api/calendar/events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}
