import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth-utils';

const ROLE_DASHBOARDS: Record<string, string> = {
    SUPER_ADMIN: '/dashboard/admin',
    DIVISI_OS: '/dashboard/os',
    PARTNER_OS: '/dashboard/os',
    DIVISI_OT: '/dashboard/ot',
    PARTNER_OT: '/dashboard/ot',
    DIVISI_OP: '/dashboard/op',
    PARTNER_OP: '/dashboard/op',
    DIVISI_UQ: '/dashboard/uq',
    PARTNER_UQ: '/dashboard/uq',
    ANALYST: '/dashboard/analyst',
    CABANG: '/dashboard/employee',
};

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    
    // LOG ALL REQUESTS TO INTERFACE WITH TERMINAL
    console.log(`[MIDDLEWARE] ${request.method} ${path}`);

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

    // EXPLICIT BYPASS for public embed routes
    if (path.startsWith('/embed') || path.startsWith('/api/embed')) {
        return NextResponse.next();
    }

    const demoEnabled = process.env.DEMO_MODE === 'true';
    const isDemo = demoEnabled && (request.nextUrl.searchParams.get('demo') === '1' || request.headers.get('x-demo') === 'true');

    // Paths that don't require auth
    const isAuthPath = path.startsWith('/auth') || path.startsWith('/api/auth');
    const isPublicEmbedPath = path.startsWith('/embed') || 
                             path.startsWith('/api/embed') ||
                             path.startsWith('/api/dashboards/query') ||
                             path.startsWith('/api/dashboards/insights') ||
                             path.startsWith('/api/admin/reports') ||
                             path.startsWith('/api/admin/analytics') ||
                             (path === '/api/dashboards' && request.method === 'GET');
    const isPublicPath = isAuthPath || isPublicEmbedPath || path === '/';

    // Verify session
    const payload = session ? await verifySession(session) : null;
    
    if (session && !payload) {
        console.warn(`[MIDDLEWARE] Invalid session for path: ${path}`);
    }

    // 1. If trying to access protected route without valid session and not in demo mode
    if (!isPublicPath && !payload && !isDemo) {
        // FOR ALL /api ROUTES: Return 401 JSON instead of redirecting to HTML login
        if (path.startsWith('/api/')) {
            console.log(`[MIDDLEWARE] Unauthorized API request to ${path} - returning 401`);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        console.log(`[MIDDLEWARE] Redirecting ${path} to /auth/login`);
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // If in demo mode, skip further checks
    if (isDemo && !payload) {
        return NextResponse.next();
    }

    if (payload) {
        // Normalize role for consistent checking
        const role = String(payload.role).trim().toUpperCase();

        // 2. If logged in and trying to access AUTH pages (login/register), redirect to dashboard
        if (isAuthPath) {
            const dashboardUrl = ROLE_DASHBOARDS[role] || '/dashboard/employee';
            return NextResponse.redirect(new URL(dashboardUrl, request.url));
        }

        // 3. Role based access control for dashboards
        
        // Division users should not land on generic employee dashboard
        if (path === '/dashboard/employee') {
            const correctDashboard = ROLE_DASHBOARDS[role];
            if (correctDashboard && correctDashboard !== '/dashboard/employee') {
                 return NextResponse.redirect(new URL(correctDashboard, request.url));
            }
        }

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
             if (!['DIVISI_OS', 'PARTNER_OS', 'DIVISI_OT', 'PARTNER_OT', 'DIVISI_OP', 'PARTNER_OP', 'DIVISI_UQ', 'PARTNER_UQ'].includes(role)) {
                  return NextResponse.redirect(new URL('/dashboard/employee', request.url));
             }
        }
        if (path.startsWith('/dashboard/ot') && !['DIVISI_OT', 'PARTNER_OT'].includes(role)) {
             return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }
        if (path.startsWith('/dashboard/op') && !['DIVISI_OP', 'PARTNER_OP'].includes(role)) {
             return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }
        if (path.startsWith('/dashboard/uq') && !['DIVISI_UQ', 'PARTNER_UQ'].includes(role)) {
             return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }
        if (path.startsWith('/dashboard/hc') && !['DIVISI_HC', 'PARTNER_HC'].includes(role)) {
             return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }
        if (path.startsWith('/dashboard/ht') && !['DIVISI_HT', 'PARTNER_HT'].includes(role)) {
             return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/auth/:path*',
        '/embed/:path*',
        '/api/:path*',
        '/',
    ],
};
