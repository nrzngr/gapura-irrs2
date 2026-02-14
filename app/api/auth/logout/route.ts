import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    const cookieStore = await cookies();
    
    // Multi-Account Logout: Remove only the current active account
    const bundleStr = cookieStore.get('auth_bundle')?.value;
    if (bundleStr) {
        try {
            const bundle = JSON.parse(bundleStr);
            const activeUid = bundle.active_uid;
            
            if (activeUid) {
                delete bundle.sessions[activeUid];
                // Find next available account to make active
                const remainingUids = Object.keys(bundle.sessions);
                if (remainingUids.length > 0) {
                    bundle.active_uid = remainingUids[0];
                    cookieStore.set('auth_bundle', JSON.stringify(bundle), {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        maxAge: 60 * 60 * 24,
                        path: '/',
                    });
                    // Set next active session
                    cookieStore.set('session', bundle.sessions[bundle.active_uid], {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        maxAge: 60 * 60 * 24,
                        path: '/',
                    });
                } else {
                    cookieStore.delete('auth_bundle');
                    cookieStore.delete('session');
                }
            }
        } catch (e) {
            cookieStore.delete('auth_bundle');
            cookieStore.delete('session');
        }
    } else {
        cookieStore.delete('session');
    }

    return NextResponse.json({ success: true });
}
