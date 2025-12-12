import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { verifyPassword, signSession } from '@/lib/auth-utils';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email dan password wajib diisi' },
                { status: 400 }
            );
        }

        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (!user) {
            return NextResponse.json( // Generic error for security
                { error: 'Email atau password salah' },
                { status: 401 }
            );
        }

        const isValid = await verifyPassword(password, user.password);

        if (!isValid) {
            return NextResponse.json(
                { error: 'Email atau password salah' },
                { status: 401 }
            );
        }

        if (user.status !== 'active') {
            let msg = 'Akun Anda belum aktif. Mohon hubungi admin.';
            if (user.status === 'rejected') msg = 'Akun Anda telah ditolak.';
            if (user.status === 'pending') msg = 'Akun Anda sedang dalam peninjauan admin.';

            return NextResponse.json(
                { error: msg },
                { status: 403 }
            );
        }

        // Create session
        const token = await signSession({ id: user.id, email: user.email, role: user.role });
        const cookieStore = await cookies();

        cookieStore.set('session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });

        return NextResponse.json({ success: true, role: user.role });
    } catch (err) {
        console.error('Login error:', err);
        return NextResponse.json(
            { error: 'Terjadi kesalahan pada server' },
            { status: 500 }
        );
    }
}
