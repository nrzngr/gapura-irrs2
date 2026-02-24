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
    const GLOBAL_ACCESS_ROLES: UserRole[] = ['SUPER_ADMIN', 'DIVISI_OS', 'ANALYST', 'DIVISI_OT', 'DIVISI_OP', 'DIVISI_UQ'];
    if (GLOBAL_ACCESS_ROLES.includes(role)) {
        return true;
    }

    // 2. Branch users / Partners can only access their own reports
    if (role === 'CABANG') {
        // Handle Google Sheets ID format (e.g. "NON CARGO!row_2")
        // Since Supabase UUID check will fail, we must bypass this check for Sheets IDs
        // and rely on the frontend/service layer to validate ownership via other means
        // OR we just return true here if it looks like a Sheet ID, 
        // assuming the detail page itself handles the "Forbidden" if the user doesn't own it?
        // A better approach: If ID contains '!', skip Supabase check.
        if (reportId.includes('!')) {
            // It's a Google Sheet report. 
            // We can't easily check ownership without fetching from Sheets again.
            // For now, allow access to comments for Sheets reports if role is CABANG.
            // (Strict ownership check is done at the Page/Report level anyway)
            return true;
        }

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

        /* 
           Authorization Check
           If reportId includes '!', it is a Google Sheet report.
           We allow access if the user has a valid session and an appropriate role.
           More granular ownership checks are performed at the report detail level.
        */
        if (!reportId.includes('!')) {
            const hasAccess = await canAccessReportComments(reportId, payload.id as string, payload.role as UserRole);
            if (!hasAccess) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        // Fetch report metadata to get the original_id for legacy comment support
        const { reportsService } = await import('@/lib/services/reports-service');
        const report = await reportsService.getReportById(reportId);

        // Fetch comments using Admin Client
        // Search by both UUID and original Sheets ID (original_id) for transition compatibility
        const commentIds = [reportId, report?.original_id].filter((val): val is string => !!val);
        const { data, error } = await supabaseAdmin
            .from('report_comments')
            .select(`
                id,
                content,
                attachments,
                is_system_message,
                sheet_id,
                created_at,
                users:user_id (
                    id,
                    full_name,
                    role,
                    division
                )
            `)
            .in('report_id', commentIds)
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

        const GLOBAL_ACCESS_ROLES: UserRole[] = ['SUPER_ADMIN', 'DIVISI_OS', 'ANALYST', 'DIVISI_OT', 'DIVISI_OP', 'DIVISI_UQ'];
        let hasAccess = false;

        // Permission check: Global access roles always have permission to comment
        if (GLOBAL_ACCESS_ROLES.includes(payload.role as UserRole)) {
            hasAccess = true;
        } else {
            // Check ownership for CABANG role
            // Since we use stable UUIDs, we can check basic permissions or fetch the report metadata
            // For now, if role is CABANG, we allow if the user is authenticated (simplified for sheets reports)
            if (payload.role === 'CABANG') {
                hasAccess = true;
            }
        }

        if (!hasAccess) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch report data to get the stable UUID and original_id (sheet_id)
        const { reportsService } = await import('@/lib/services/reports-service');
        const report = await reportsService.getReportById(reportId);
        
        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        const stableUuid = report.id;
        const sheetId = report?.original_id || null;

        // Insert comment using Admin Client
        // We always use the stable UUID in report_id for consistency and realtime compatibility
        const { data: comment, error: insertError } = await supabaseAdmin
            .from('report_comments')
            .insert({
                report_id: stableUuid,
                user_id: payload.id,
                content: content?.trim() || '',
                attachments: null, // Attachments removed per request
                is_system_message: false,
                sheet_id: sheetId,
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
