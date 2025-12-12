import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET all users (for admin) with relations
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        let query = supabase
            .from('users')
            .select(`
        *,
        stations:station_id (code, name),
        units:unit_id (name),
        positions:position_id (name)
      `)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Gagal memuat users' }, { status: 500 });
    }
}

// PATCH to update user status or role
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { userId, status, role } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

        if (status) {
            if (!['pending', 'active', 'rejected'].includes(status)) {
                return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
            }
            updates.status = status;
        }

        if (role) {
            if (!['reporter', 'supervisor', 'investigator', 'manager', 'admin'].includes(role)) {
                return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
            }
            updates.role = role;
        }

        const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Gagal mengubah user' }, { status: 500 });
    }
}
