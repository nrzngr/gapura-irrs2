import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth-utils';

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

    // 2. If logged in and trying to access auth pages, redirect to dashboard
    if (isPublicPath && payload && path !== '/') {
        // Admin goes to admin dashboard, everyone else to employee dashboard
        const dashboardUrl = payload.role === 'admin' ? '/dashboard/admin' : '/dashboard/employee';
        return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }

    // 3. Role based access control for dashboards
    // Admin dashboard is only for admin role
    if (path.startsWith('/dashboard/admin') && payload?.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard/employee', request.url));
    }

    // Employee dashboard is for non-admin roles (reporter, supervisor, investigator, manager)
    // Allow all non-admin authenticated users to access employee dashboard
    // No additional redirect needed here - if they're authenticated and not admin, they can use employee dashboard

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/auth/:path*',
        '/'
    ],
};
