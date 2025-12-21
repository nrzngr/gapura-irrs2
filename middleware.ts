import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth-utils';

const ROLE_DASHBOARDS: Record<string, string> = {
    SUPER_ADMIN: '/dashboard/admin',
    OS_ADMIN: '/dashboard/os',
    OSC_LEAD: '/dashboard/osc',
    PARTNER_ADMIN: '/dashboard/partner',
    BRANCH_USER: '/dashboard/employee',
    // Fallback for others to partner or employee as appropriate
    OT_ADMIN: '/dashboard/os',
    OP_ADMIN: '/dashboard/os',
    UQ_ADMIN: '/dashboard/os',
};

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const session = request.cookies.get('session')?.value;

    // Paths that don't require auth
    const isPublicPath = path.startsWith('/auth') || path === '/';

    // Verify session
    const payload = session ? await verifySession(session) : null;

    // 1. If trying to access protected route without valid session
    if (!isPublicPath && !payload) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
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

        // OSC Dashboard (OSC_LEAD)
        if (path.startsWith('/dashboard/osc') && role !== 'OSC_LEAD') {
             return NextResponse.redirect(new URL('/dashboard/employee', request.url));
        }

        // OS Dashboard (OS_ADMIN) - MUST be checked AFTER OSC or explicitly exclude OSC
        // Fix: Ensure we don't accidentally match /dashboard/osc
        if (path.startsWith('/dashboard/os') && !path.startsWith('/dashboard/osc')) {
             if (!['OS_ADMIN', 'OT_ADMIN', 'OP_ADMIN', 'UQ_ADMIN'].includes(role)) {
                  return NextResponse.redirect(new URL('/dashboard/employee', request.url));
             }
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
