import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface DashboardConfig {
  dateRange?: string;
  autoRefresh?: boolean;
  theme?: 'dark' | 'light';
  dateFrom?: string;
  dateTo?: string;
  subtitle?: string;
  filters?: string[];
  pages?: string[]; // ordered page names
}

interface ChartConfig {
  title: string;
  chartType: string;
  dataField: string;
  width: 'full' | 'half' | 'third';
  position: number;
  query_config?: Record<string, unknown>;
  visualization_config?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  page_name?: string;
}

// GET - List all public dashboards or specific dashboard by slug
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (slug) {
      // Fetch specific dashboard with its charts
      const { data: dashboard, error } = await supabase
        .from('custom_dashboards')
        .select(`
          id,
          name,
          description,
          slug,
          config,
          created_at,
          dashboard_charts (
            id,
            title,
            chart_type,
            data_field,
            position,
            width,
            config,
            query_config,
            visualization_config,
            layout,
            page_name
          )
        `)
        .eq('slug', slug)
        .eq('is_public', true)
        .single();

      if (error || !dashboard) {
        return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
      }

      return NextResponse.json(dashboard, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    }

    // List all public dashboards
    const { data: dashboards, error } = await supabase
      .from('custom_dashboards')
      .select('id, name, description, slug, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ dashboards }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Create new dashboard (requires analyst/admin auth in real app)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, charts, config } = body as {
      name: string;
      description?: string;
      charts: ChartConfig[];
      config?: DashboardConfig;
    };

    if (!name || !charts || charts.length === 0) {
      return NextResponse.json({ error: 'Name and at least one chart required' }, { status: 400 });
    }

    // Generate unique slug
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Create dashboard
    const { data: dashboard, error: dashError } = await supabase
      .from('custom_dashboards')
      .insert({
        name,
        description: description || null,
        slug,
        config: config || { dateRange: '7d', autoRefresh: true, theme: 'dark' },
        is_public: true
      })
      .select('id, slug')
      .single();

    if (dashError || !dashboard) {
      return NextResponse.json({ error: dashError?.message || 'Failed to create dashboard' }, { status: 500 });
    }

    // Create charts
    const chartInserts = charts.map((c, i) => ({
      dashboard_id: dashboard.id,
      title: c.title,
      chart_type: c.chartType,
      data_field: c.dataField,
      width: c.width || 'half',
      position: c.position ?? i,
      config: {},
      query_config: c.query_config || null,
      visualization_config: c.visualization_config || null,
      layout: c.layout || null,
      page_name: c.page_name || 'Ringkasan Umum',
    }));

    const { error: chartsError } = await supabase
      .from('dashboard_charts')
      .insert(chartInserts);

    if (chartsError) {
      // Rollback: delete the dashboard
      await supabase.from('custom_dashboards').delete().eq('id', dashboard.id);
      return NextResponse.json({ error: chartsError.message }, { status: 500 });
    }

    // Generate embed URL
    const embedUrl = `/embed/custom/${dashboard.slug}`;

    return NextResponse.json({
      success: true,
      dashboard: {
        id: dashboard.id,
        slug: dashboard.slug,
        embedUrl,
        fullUrl: `${process.env.NEXT_PUBLIC_BASE_URL || ''}${embedUrl}`
      }
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete dashboard by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Dashboard ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('custom_dashboards')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
