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
            .select('*, positions(name)')
            .eq('email', email)
            .single();

        if (!user) {
            return NextResponse.json(
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

        // AUTO-CORRECT ROLE for OT/OP/UQ if deemed as PARTNER
        // This ensures they get the correct dashboard experience
        let finalRole = user.role;
        const posName = user.positions?.name?.toUpperCase() || '';
        
        console.log('[LOGIN DEBUG] User:', user.email, 'Role:', user.role, 'Position:', posName);

        // Loose check for any PARTNER role
        if (finalRole.includes('PARTNER')) {
            const emailUpper = email.toUpperCase();
            if (posName.includes('OT') || posName.includes('TEKNOLOGI') || emailUpper.includes('PARTNER.OT')) finalRole = 'OT_ADMIN';
            else if (posName.includes('OP') || posName.includes('OPERASI') || emailUpper.includes('PARTNER.OP')) finalRole = 'OP_ADMIN';
            else if (posName.includes('UQ') || posName.includes('QUAL') || emailUpper.includes('PARTNER.UQ')) finalRole = 'UQ_ADMIN';
        }

        console.log('[LOGIN DEBUG] Final Role:', finalRole);

        // Create session with FINAL role
        const token = await signSession({ id: user.id, email: user.email, role: finalRole });
        const cookieStore = await cookies();

        cookieStore.set('session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });

        return NextResponse.json({ success: true, role: finalRole });
    } catch (err) {
        console.error('Login error:', err);
        return NextResponse.json(
            { error: 'Terjadi kesalahan pada server' },
            { status: 500 }
        );
    }
}
