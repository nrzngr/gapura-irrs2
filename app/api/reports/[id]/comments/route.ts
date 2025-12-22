import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';
import { UserRole } from '@/types';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Helper to check if user has access to the report's comments
async function canAccessReportComments(reportId: string, userId: string, role: UserRole): Promise<boolean> {
    // 1. High-level admins always have access
    const GLOBAL_ACCESS_ROLES: UserRole[] = ['SUPER_ADMIN', 'OS_ADMIN', 'OSC_LEAD', 'OT_ADMIN', 'OP_ADMIN', 'UQ_ADMIN'];
    if (GLOBAL_ACCESS_ROLES.includes(role)) {
        return true;
    }

    // 2. Branch users / Partners can only access their own reports
    if (role === 'BRANCH_USER' || role === 'PARTNER_ADMIN') {
        const { data: report, error } = await supabaseAdmin
            .from('reports')
            .select('user_id')
            .eq('id', reportId)
            .single();
        
        if (error || !report) return false;
        return report.user_id === userId;
    }

    return false;
}

/**
 * GET /api/reports/[id]/comments
 * Fetch all comments for a report including user info
 * Uses Admin Client to bypass RLS, with manual auth check
 */
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id: reportId } = await params;
        
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifySession(token);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        // Authorization Check
        const hasAccess = await canAccessReportComments(reportId, payload.id as string, payload.role as UserRole);
        if (!hasAccess) {
             return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch comments using Admin Client
        const { data, error } = await supabaseAdmin
            .from('report_comments')
            .select(`
                id,
                content,
                attachments,
                is_system_message,
                created_at,
                users:user_id (
                    id,
                    full_name,
                    role,
                    division
                )
            `)
            .eq('report_id', reportId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching comments:', error);
            return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in GET /api/reports/[id]/comments:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/reports/[id]/comments  
 * Add a new comment to a report
 * Uses Admin Client to bypass RLS, with manual auth check
 */
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { id: reportId } = await params;
        
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifySession(token);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        const body = await request.json();
        const { content, attachments = [] } = body;

        // Validate: content is required unless there are attachments
        if (!content?.trim() && attachments.length === 0) {
            return NextResponse.json({ error: 'Content or attachments required' }, { status: 400 });
        }

        // Authorization Check & Report Validation
        // We fetch the report first to check status AND ownership in one go if possible, 
        // but for clarity we'll reuse our helper or do a specific check.
        // Let's do a specific check to get status as well.
        
        const { data: report, error: reportError } = await supabaseAdmin
            .from('reports')
            .select('id, status, user_id')
            .eq('id', reportId)
            .single();

        if (reportError || !report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Check Permissions
        const GLOBAL_ACCESS_ROLES: UserRole[] = ['SUPER_ADMIN', 'OS_ADMIN', 'OSC_LEAD', 'OT_ADMIN', 'OP_ADMIN', 'UQ_ADMIN'];
        let hasAccess = false;
        
        if (GLOBAL_ACCESS_ROLES.includes(payload.role as UserRole)) {
            hasAccess = true;
        } else if ((payload.role === 'BRANCH_USER' || payload.role === 'PARTNER_ADMIN') && report.user_id === payload.id) {
            hasAccess = true;
        }

        if (!hasAccess) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Prevent comments on closed reports
        if (report.status === 'CLOSED') {
            return NextResponse.json({ error: 'Cannot comment on closed reports' }, { status: 400 });
        }

        // Insert comment using Admin Client
        const { data: comment, error: insertError } = await supabaseAdmin
            .from('report_comments')
            .insert({
                report_id: reportId,
                user_id: payload.id,
                content: content?.trim() || '',
                attachments: attachments.length > 0 ? attachments : null,
                is_system_message: false,
            })
            .select(`
                id,
                content,
                attachments,
                is_system_message,
                created_at,
                users:user_id (
                    id,
                    full_name,
                    role,
                    division
                )
            `)
            .single();

        if (insertError) {
            console.error('Error creating comment:', insertError);
            return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
        }

        return NextResponse.json(comment, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/reports/[id]/comments:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
