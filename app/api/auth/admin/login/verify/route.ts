import { NextResponse } from 'next/server';
import { verifyAdminLogin } from '@/lib/admin-login';
import { authSessionCookieName, buildSessionCookieOptions, issueAuthJwt } from '@/lib/issue-jwt';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { clientIp } from '@/lib/signer';

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const loginId = typeof body.loginId === 'string' ? body.loginId.trim() : '';
        const code = typeof body.code === 'string' ? body.code : '';

        if (!loginId) {
            return NextResponse.json({ error: 'Missing login session. Please request a new code.' }, { status: 400 });
        }

        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('admin-login-verify', [ip, loginId]), 15, 60 * 60 * 1000);

        if (!process.env.AUTH_SECRET?.trim()) {
            return NextResponse.json(
                { error: 'Server auth not configured. Add AUTH_SECRET to environment variables.' },
                { status: 500 }
            );
        }

        const user = await verifyAdminLogin(loginId, code);
        const token = await issueAuthJwt({
            id: user.id,
            email: user.email,
            role: user.role,
        });

        const response = NextResponse.json({ success: true });
        response.cookies.set(authSessionCookieName(), token, buildSessionCookieOptions());
        return response;
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status, headers: { 'Retry-After': String(r.retryAfterSec) } });
        }
        const msg = err instanceof Error ? err.message : 'Verification failed';
        const status =
            msg.includes('Incorrect') ||
            msg.includes('expired') ||
            msg.includes('Too many') ||
            msg.includes('6-digit') ||
            msg.includes('session')
                ? 400
                : 500;
        return NextResponse.json({ error: msg }, { status });
    }
}
