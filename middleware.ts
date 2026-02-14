import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth-utils';

const ROLE_DASHBOARDS: Record<string, string> = {
    SUPER_ADMIN: '/dashboard/admin',
    DIVISI_OS: '/dashboard/os',
    DIVISI_OT: '/dashboard/ot',
    DIVISI_OP: '/dashboard/op',
    DIVISI_UQ: '/dashboard/uq',
    ANALYST: '/dashboard/analyst',
    CABANG: '/dashboard/employee',
};

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const cookieStore = request.cookies;
    
    // Multi-Account Support: Try to extract active session from bundle first
    let session = cookieStore.get('session')?.value;
    const authBundle = cookieStore.get('auth_bundle')?.value;

    if (authBundle) {
        try {
            const bundle = JSON.parse(authBundle);
            if (bundle.active_uid && bundle.sessions[bundle.active_uid]) {
                session = bundle.sessions[bundle.active_uid];
            }
        } catch { /* fallback to legacy */ }
    }

    const demoEnabled = process.env.DEMO_MODE === 'true';
    const isDemo = demoEnabled && (request.nextUrl.searchParams.get('demo') === '1' || request.headers.get('x-demo') === 'true');

    // Paths that don't require auth
    // /embed/* routes are public for PowerPoint hyperlink integration
    const isPublicPath = path.startsWith('/auth') || 
                         path.startsWith('/embed') || 
                         path.startsWith('/api/embed') || 
                         path === '/';

    // Verify session
    const payload = session ? await verifySession(session) : null;

    // 1. If trying to access protected route without valid session and not in demo mode
    if (!isPublicPath && !payload && !isDemo) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // If in demo mode, skip further checks
    if (isDemo && !payload) {
        return NextResponse.next();
    }

    if (payload) {
        // Normalize role for consistent checking
        const role = String(payload.role).trim().toUpperCase();

        // 2. If logged in and trying to access auth pages, redirect to dashboard
        if (isPublicPath && path !== '/') {
            const dashboardUrl = ROLE_DASHBOARDS[role] || '/dashboard/employee';
            return NextResponse.redirect(new URL(dashboardUrl, request.url));
        }

        // 3. Role based access control for dashboards
        
        // Admin dashboard protection
        if (path.startsWith('/dashboard/admin') && role !== 'SUPER_ADMIN') {
            return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }

        // Analyst Dashboard (ANALYST)
        if (path.startsWith('/dashboard/analyst') && role !== 'ANALYST') {
             return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }

        // Division Dashboards (OS, OT, OP, UQ)
        if (path.startsWith('/dashboard/os') && !path.startsWith('/dashboard/analyst')) {
             if (!['DIVISI_OS', 'DIVISI_OT', 'DIVISI_OP', 'DIVISI_UQ'].includes(role)) {
                  return NextResponse.redirect(new URL('/dashboard/employee', request.url));
             }
        }
        if (path.startsWith('/dashboard/ot') && role !== 'DIVISI_OT') {
             return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }
        if (path.startsWith('/dashboard/op') && role !== 'DIVISI_OP') {
             return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }
        if (path.startsWith('/dashboard/uq') && role !== 'DIVISI_UQ') {
             return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/auth/:path*',
        '/'
    ],
};
