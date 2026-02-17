import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { verifyPassword, signSession, registerSession } from '@/lib/auth-utils';
import { logSecurityEvent } from '@/lib/security/event-service';
import { getClientIp } from '@/lib/security/utils';

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
            await logSecurityEvent({
                source: 'auth-login-api',
                event_type: 'login',
                severity: 'MEDIUM',
                payload: { email, success: false, reason: 'USER_NOT_FOUND' },
                ip_address: getClientIp(request)
            });

            return NextResponse.json(
                { error: 'Email atau password salah' },
                { status: 401 }
            );
        }

        const isValid = await verifyPassword(password, user.password);

        if (!isValid) {
            await logSecurityEvent({
                source: 'auth-login-api',
                event_type: 'login',
                severity: 'MEDIUM',
                payload: { email, success: false, reason: 'INVALID_PASSWORD' },
                ip_address: getClientIp(request),
                actor_id: user.id
            });

            return NextResponse.json(
                { error: 'Email atau password salah' },
                { status: 401 }
            );
        }

        if (user.status !== 'active') {
            let msg = 'Akun Anda belum aktif. Mohon hubungi admin.';
            if (user.status === 'rejected') msg = 'Akun Anda telah ditolak.';
            if (user.status === 'pending') msg = 'Akun Anda sedang dalam peninjauan admin.';

            await logSecurityEvent({
                source: 'auth-login-api',
                event_type: 'login',
                severity: 'LOW',
                payload: { email, success: false, reason: 'INACTIVE_STATUS', status: user.status },
                ip_address: getClientIp(request),
                actor_id: user.id
            });

            return NextResponse.json(
                { error: msg },
                { status: 403 }
            );
        }

        // AUTO-CORRECT ROLE for OT/OP/UQ/HC/HT if deemed as PARTNER
        // This ensures they get the correct dashboard experience
        let finalRole = user.role;
        const posName = (user.positions?.name || '').toUpperCase();
        const division = (user.division || '').toUpperCase();
        const emailUpper = email.toUpperCase();
        
        console.log('[LOGIN DEBUG] User:', user.email, 'Role:', user.role, 'Position:', posName, 'Division:', division);

        // Logic 1: If role is specifically marked as PARTNER_X, or if it says CABANG/PARTNER but has a division
        if (finalRole === 'CABANG' || finalRole.includes('PARTNER')) {
            if (division === 'OS' || posName.includes('OS') || emailUpper.includes('PARTNER.OS')) finalRole = 'PARTNER_OS';
            else if (division === 'OT' || posName.includes('OT') || posName.includes('TEKNOLOGI') || emailUpper.includes('PARTNER.OT')) finalRole = 'PARTNER_OT';
            else if (division === 'OP' || posName.includes('OP') || posName.includes('OPERASI') || emailUpper.includes('PARTNER.OP')) finalRole = 'PARTNER_OP';
            else if (division === 'UQ' || posName.includes('UQ') || posName.includes('QUAL') || emailUpper.includes('PARTNER.UQ')) finalRole = 'PARTNER_UQ';
            else if (division === 'HC' || posName.includes('HC') || emailUpper.includes('PARTNER.HC')) finalRole = 'PARTNER_HC';
            else if (division === 'HT' || posName.includes('HT') || emailUpper.includes('PARTNER.HT')) finalRole = 'PARTNER_HT';
        }

        console.log('[LOGIN DEBUG] Final Role:', finalRole);

        // Create session with unique ID for DB tracking
        const sid = crypto.randomUUID();
        const token = await signSession({ 
            id: user.id, 
            email: user.email, 
            role: finalRole, 
            division: user.division,
            sid 
        });
        const cookieStore = await cookies();

        // 1. Register Session in DB for security monitoring
        await registerSession(user.id, sid, getClientIp(request), request.headers.get('user-agent'));

        // 2. Multi-Account Management (Auth Bundle)
        const bundle = { active_uid: user.id, sessions: {} as Record<string, string> };
        const existingBundle = cookieStore.get('auth_bundle')?.value;
        if (existingBundle) {
            try {
                const parsed = JSON.parse(existingBundle);
                bundle.sessions = parsed.sessions || {};
            } catch { /* ignore parse errors */ }
        }
        
        bundle.active_uid = user.id;
        bundle.sessions[user.id] = token;

        // Set the multi-session bundle
        cookieStore.set('auth_bundle', JSON.stringify(bundle), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24,
            path: '/',
        });

        // Maintain legacy 'session' cookie for backward compatibility
        cookieStore.set('session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });

        await logSecurityEvent({
            source: 'auth-login-api',
            event_type: 'login',
            severity: 'LOW',
            payload: { email, success: true },
            ip_address: getClientIp(request),
            actor_id: user.id
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
