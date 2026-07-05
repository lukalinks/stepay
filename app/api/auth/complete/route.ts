import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';
import { authJwtSalt, authSessionCookieName, buildSessionCookieOptions, issueAuthJwt } from '@/lib/issue-jwt';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { isSessionTokenVersionValid } from '@/lib/session-token';
import { clientIp } from '@/lib/signer';

/** Finishes sign-in when the client holds an Auth.js session JWT (e.g. from mobile) and needs a browser cookie. */
export async function POST(request: Request) {
    try {
        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('auth-complete', [ip]), 20, 15 * 60 * 1000);

        const body = await request.json();
        const { accessToken } = body || {};

        if (!accessToken || typeof accessToken !== 'string') {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const secret = process.env.AUTH_SECRET?.trim();
        if (!secret) {
            return NextResponse.json({ error: 'Auth not configured. Add AUTH_SECRET to environment variables.' }, { status: 500 });
        }

        const salt = authJwtSalt();
        const payload = await decode({ token: accessToken, secret, salt });
        if (!payload?.sub) {
            return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
        }

        const valid = await isSessionTokenVersionValid(String(payload.sub), payload.tv);
        if (!valid) {
            return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
        }

        const cookieStore = await cookies();
        cookieStore.set(authSessionCookieName(), accessToken, buildSessionCookieOptions());

        return NextResponse.json({ success: true });
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status, headers: { 'Retry-After': String(r.retryAfterSec) } });
        }
        console.error('Auth complete error:', err);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
