import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { generateCustomerFeedbackDashboard } from '@/lib/builder/customer-feedback-template';
import { supabaseAdmin } from '@/lib/supabase-admin';

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
    
    // If no dates provided, generate without date range restrictions
    const effectiveDateFrom = dateFrom || '1900-01-01';
    const effectiveDateTo = dateTo || '2099-12-31';

    // Generate dashboard definition
    const dashboard = generateCustomerFeedbackDashboard(effectiveDateFrom, effectiveDateTo);

    // Generate unique slug
    const baseSlug = 'customer-feedback';
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Insert dashboard into database
    const { data: dbDashboard, error: insertError } = await supabaseAdmin
      .from('custom_dashboards')
      .insert({
        name: dashboard.name || 'Customer Feedback Dashboard',
        description: dashboard.description || 'Customer Feedback Analysis Dashboard',
        slug: slug,
        config: {
          pages: dashboard.pages?.map(p => p.name) || ['Case Category', 'Detail Category', 'Detail Report'],
        },
      })
      .select()
      .single();

    if (insertError || !dbDashboard) {
      console.error('Failed to insert dashboard:', insertError);
      return NextResponse.json({ error: 'Gagal menyimpan dashboard' }, { status: 500 });
    }

    // Insert all tiles
    const allTiles = (dashboard.pages || []).flatMap((page) => 
      (page.tiles || []).map((tile, tidx) => ({
        dashboard_id: dbDashboard.id,
        title: tile.visualization?.title || 'Untitled Chart',
        chart_type: tile.visualization?.chartType || 'bar',
        data_field: 'customer_feedback',
        query_config: tile.query,
        visualization_config: tile.visualization,
        layout: tile.layout,
        position: tidx,
        page_name: page.name
      }))
    );

    if (allTiles.length > 0) {
      const { error: tileError } = await supabaseAdmin
        .from('dashboard_charts')
        .insert(allTiles);
      
      if (tileError) {
        console.error('Failed to insert tiles:', tileError);
      }
    }

    // Return dashboard with database ID and slug
    return NextResponse.json({ 
      dashboard: {
        ...dashboard,
        id: dbDashboard.id,
        slug: dbDashboard.slug
      } 
    });
  } catch (err) {
    console.error('Customer feedback generate error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
