import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { validateQuery, buildQuery } from '@/lib/builder/sql-builder';
import type { QueryDefinition } from '@/types/builder';

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

    // Parse body
    const body = await request.json();
    const query: QueryDefinition = body.query;

    if (!query) {
      return NextResponse.json({ error: 'Query definition diperlukan' }, { status: 400 });
    }

    // Validate
    const errors = validateQuery(query);
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Query tidak valid', details: errors }, { status: 400 });
    }

    // Build SQL
    const { sql, params } = buildQuery(query);

    // Execute via Postgres function
    const startTime = Date.now();

    const { data, error } = await supabaseAdmin.rpc('run_analytics_query', {
      query_text: sql,
      query_params: params.map(String),
    });

    const executionTimeMs = Date.now() - startTime;

    if (error) {
      console.error('Query execution error:', error);
      return NextResponse.json(
        { error: 'Gagal menjalankan query', details: error.message },
        { status: 500 }
      );
    }

    const rows = Array.isArray(data) ? data : [];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return NextResponse.json({
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs,
    });
  } catch (err) {
    console.error('Query API error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
