import { NextResponse } from 'next/server';
import { authSessionCookieName, clearSessionCookieOptions } from '@/lib/issue-jwt';

export async function GET() {
    return NextResponse.json({ message: 'Use POST to log out.' });
}

export async function POST() {
    const response = NextResponse.json({ success: true });
    /** Clear session cookie — signOut from a Route Handler alone may not clear the browser cookie. */
    response.cookies.set(authSessionCookieName(), '', clearSessionCookieOptions());
    return response;
}
