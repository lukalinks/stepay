import { NextResponse } from 'next/server';
import { isAdminLoginEmail } from '@/lib/admin-login';
import { isAdminRole } from '@/lib/admin-roles';
import { issueAuthJwt } from '@/lib/issue-jwt';
import { setSessionCookie } from '@/lib/session-cookies';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { clientIp } from '@/lib/signer';
import { sql } from '@/lib/db';
import { verifyUserCredentials } from '@/lib/verify-credentials';

export async function POST(request: Request) {
    try {
        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('admin-login-password', [ip]), 20, 15 * 60 * 1000);

        const body = await request.json().catch(() => ({}));
        const email = typeof body.email === 'string' ? body.email.trim() : '';
        const password = typeof body.password === 'string' ? body.password : '';

        if (!email.includes('@')) {
            return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
        }
        if (!password || password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        if (isAdminLoginEmail(email)) {
            return NextResponse.json(
                { error: 'This account uses a one-time email code. Switch to Superadmin login.' },
                { status: 400 }
            );
        }

        await assertRateLimit(rateLimitKey('admin-login-password-email', [email.toLowerCase()]), 10, 15 * 60 * 1000);

        if (!process.env.AUTH_SECRET?.trim()) {
            return NextResponse.json(
                { error: 'Server auth not configured. Add AUTH_SECRET to environment variables.' },
                { status: 500 }
            );
        }

        const user = await verifyUserCredentials(email, password);
        if (!user || !isAdminRole(user.role)) {
            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
        }

        const rows = await sql`
            SELECT suspended FROM users WHERE id = ${user.id} LIMIT 1
        `;
        if (Boolean((rows[0] as { suspended?: boolean } | undefined)?.suspended)) {
            return NextResponse.json({ error: 'This account is suspended.' }, { status: 403 });
        }

        const token = await issueAuthJwt({
            id: user.id,
            email: user.email,
            role: user.role,
            sessionTokenVersion: user.sessionTokenVersion,
        });

        const response = NextResponse.json({ success: true, userId: user.id, role: user.role });
        setSessionCookie(response, token);
        return response;
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json(
                { error: r.error },
                { status: r.status, headers: { 'Retry-After': String(r.retryAfterSec) } }
            );
        }
        console.error('Admin password login:', err);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
