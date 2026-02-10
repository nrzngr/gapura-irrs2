import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { validateQuery, buildQuery } from '@/lib/builder/sql-builder';
import type { QueryDefinition } from '@/types/builder';

const MAX_BATCH_SIZE = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const queries: { id: string; query: QueryDefinition }[] = body.queries;

    if (!Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json({ error: 'queries array diperlukan' }, { status: 400 });
    }

    if (queries.length > MAX_BATCH_SIZE) {
      return NextResponse.json({ error: `Maksimal ${MAX_BATCH_SIZE} queries per batch` }, { status: 400 });
    }

    // Validate all queries first
    for (const q of queries) {
      const errors = validateQuery(q.query);
      if (errors.length > 0) {
        return NextResponse.json(
          { error: `Query "${q.id}" tidak valid`, details: errors },
          { status: 400 }
        );
      }
    }

    // Execute all queries in parallel
    const startTime = Date.now();

    const results = await Promise.all(
      queries.map(async (q) => {
        try {
          const { sql, params } = buildQuery(q.query);
          const { data, error } = await supabaseAdmin.rpc('run_analytics_query', {
            query_text: sql,
            query_params: params.map(String),
          });

          if (error) {
            return { id: q.id, error: error.message, columns: [], rows: [], rowCount: 0 };
          }

          const rows = Array.isArray(data) ? data : [];
          const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
          return { id: q.id, columns, rows, rowCount: rows.length };
        } catch (err) {
          return { id: q.id, error: err instanceof Error ? err.message : 'Unknown error', columns: [], rows: [], rowCount: 0 };
        }
      })
    );

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({ results, executionTimeMs }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'CDN-Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
