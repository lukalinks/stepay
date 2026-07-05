import { NextResponse } from 'next/server';
import { issueAuthJwt } from '@/lib/issue-jwt';
import { setSessionCookie } from '@/lib/session-cookies';
import { verifyUserCredentials } from '@/lib/verify-credentials';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { clientIp } from '@/lib/signer';

export async function GET() {
    return NextResponse.json({ message: 'Use POST with { email, password } to log in.' });
}

export async function POST(request: Request) {
    try {
        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('login', [ip]), 20, 15 * 60 * 1000);

        const body = await request.json();
        const { email, password } = body;

        const trimmed = typeof email === 'string' ? email.trim() : '';
        const pwd = typeof password === 'string' ? password : '';
        if (!trimmed || !trimmed.includes('@')) {
            return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
        }
        if (!pwd || pwd.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        await assertRateLimit(rateLimitKey('login-email', [trimmed.toLowerCase()]), 10, 15 * 60 * 1000);

        if (!process.env.AUTH_SECRET?.trim()) {
            return NextResponse.json(
                { error: 'Server auth not configured. Add AUTH_SECRET to environment variables.' },
                { status: 500 }
            );
        }

        const user = await verifyUserCredentials(trimmed, pwd);
        if (!user) {
            return NextResponse.json(
                {
                    error: 'Invalid email or password. Don\'t have an account? Sign up first.',
                },
                { status: 401 }
            );
        }

        let isMobile = false;
        try {
            const url = new URL(request.url);
            isMobile = url.searchParams.get('client') === 'mobile';
        } catch {
            // ignore
        }

        const token = await issueAuthJwt({
            id: user.id,
            email: user.email,
            role: user.role,
            sessionTokenVersion: user.sessionTokenVersion,
        });

        if (isMobile) {
            return NextResponse.json({
                success: true,
                accessToken: token,
                refreshToken: token,
            });
        }

        /** Web: must set session cookie here — `signIn()` from a Route Handler does not send Set-Cookie to the browser. */
        const response = NextResponse.json({ success: true, userId: user.id, email: user.email });
        setSessionCookie(response, token);
        return response;
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status, headers: { 'Retry-After': String(r.retryAfterSec) } });
        }
        console.error('Login Error:', err);
        const raw = err instanceof Error ? err.message : String(err);
        if (
            typeof raw === 'string' &&
            (raw.includes('ECONNREFUSED') || raw.includes('ENOTFOUND') || raw.includes('database') || raw.includes('postgres'))
        ) {
            return NextResponse.json(
                { error: 'Cannot reach the database. Set DATABASE_URL in .env and restart the server.' },
                { status: 503 }
            );
        }
        let message = 'Login failed';
        if (err instanceof Error) {
            message = err.message;
        } else if (err && typeof err === 'object') {
            const o = err as { message?: string; error?: string };
            message = o.message || o.error || JSON.stringify(err).slice(0, 300) || message;
        } else if (err != null) {
            message = String(err);
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
