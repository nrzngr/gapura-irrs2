import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ALLOWED_FIELDS: Record<string, { table: string; column: string }> = {
  hub: { table: 'reports', column: 'hub' },
  branch: { table: 'reports', column: 'branch' },
  airline: { table: 'reports', column: 'airline' },
  main_category: { table: 'reports', column: 'main_category' },
  area: { table: 'reports', column: 'area' },
  target_division: { table: 'reports', column: 'target_division' },
  severity: { table: 'reports', column: 'severity' },
  status: { table: 'reports', column: 'status' },
  station_code: { table: 'reports', column: 'station_code' },
  reporting_branch: { table: 'reports', column: 'reporting_branch' },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fieldsParam = searchParams.get('fields');

    const requestedFields = fieldsParam
      ? fieldsParam.split(',').filter(f => ALLOWED_FIELDS[f])
      : Object.keys(ALLOWED_FIELDS);

    // Build a single SQL query that gets distinct values for all requested fields
    const selectParts = requestedFields.map(f => {
      const col = ALLOWED_FIELDS[f].column;
      return `array_agg(DISTINCT ${col}) FILTER (WHERE ${col} IS NOT NULL AND ${col} != '') AS ${f}`;
    });

    const { data, error } = await supabase.rpc('run_analytics_query', {
      query_text: `SELECT ${selectParts.join(', ')} FROM reports`,
      query_params: [],
    });

    if (error) {
      // Fallback: fetch each field individually via Supabase client
      const results: Record<string, string[]> = {};
      await Promise.all(
        requestedFields.map(async (field) => {
          const col = ALLOWED_FIELDS[field].column;
          const { data: rows } = await supabase
            .from('reports')
            .select(col)
            .not(col, 'is', null)
            .limit(500);

          if (rows) {
            const unique = [...new Set((rows as unknown as Record<string, unknown>[]).map(r => String(r[col])).filter(Boolean))];
            unique.sort();
            results[field] = unique;
          }
        })
      );

      return NextResponse.json(results, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    // Parse the aggregated result
    const row = Array.isArray(data) && data.length > 0 ? data[0] : {};
    const results: Record<string, string[]> = {};
    for (const field of requestedFields) {
      const vals = row[field];
      if (Array.isArray(vals)) {
        results[field] = vals.filter(Boolean).sort();
      } else {
        results[field] = [];
      }
    }

    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
