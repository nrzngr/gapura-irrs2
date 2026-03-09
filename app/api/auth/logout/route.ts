import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const cookieStore = await cookies();
    
    // Explicitly delete cookies by setting maxAge to 0 with exact same options as login
    cookieStore.set('session', '', { maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    cookieStore.set('auth_bundle', '', { maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    // Force a server-side redirect to flush state
    return NextResponse.redirect(new URL('/auth/login', request.url));
}

export async function POST() {
    const cookieStore = await cookies();
    cookieStore.set('session', '', { maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    cookieStore.set('auth_bundle', '', { maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    return NextResponse.json({ success: true });
}
