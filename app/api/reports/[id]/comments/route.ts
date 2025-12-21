import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth-utils';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/reports/[id]/comments
 * Fetch all comments for a report including user info
 * Complexity: Time O(n) | Space O(n)
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

        const { data, error } = await supabase
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
 * Complexity: Time O(1) | Space O(1)
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

        // Verify report exists
        const { data: report, error: reportError } = await supabase
            .from('reports')
            .select('id, status')
            .eq('id', reportId)
            .single();

        if (reportError || !report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Prevent comments on closed reports
        if (report.status === 'CLOSED') {
            return NextResponse.json({ error: 'Cannot comment on closed reports' }, { status: 400 });
        }

        // Insert comment
        const { data: comment, error: insertError } = await supabase
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
                    role
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
