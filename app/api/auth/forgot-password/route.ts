import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { sql } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { clientIp } from '@/lib/signer';

export async function POST(request: Request) {
    try {
        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('forgot-password', [ip]), 5, 60 * 60 * 1000);

        const body = await request.json();
        const email = typeof body.email === 'string' ? body.email.trim() : '';
        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
        }

        await assertRateLimit(rateLimitKey('forgot-password-email', [email.toLowerCase()]), 3, 60 * 60 * 1000);

        const rows = await sql`
            SELECT id FROM users
            WHERE lower(trim(email)) = lower(${email}) AND password_hash IS NOT NULL
            LIMIT 1
        `;
        const user = rows[0] as { id: string } | undefined;

        if (!user) {
            return NextResponse.json({ success: true });
        }

        const raw = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(raw).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await sql`DELETE FROM password_reset_tokens WHERE user_id = ${user.id}`;
        await sql`
            INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
            VALUES (${user.id}, ${tokenHash}, ${expiresAt.toISOString()})
        `;

        const origin =
            process.env.AUTH_URL?.replace(/\/$/, '') ||
            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        const link = `${origin}/reset-password?token=${raw}`;

        const sent = await sendPasswordResetEmail(email, link);
        if (!sent && process.env.NODE_ENV === 'production') {
            console.error('[forgot-password] Failed to send reset email for', email.split('@')[0] + '@***');
            return NextResponse.json({ error: 'Could not send reset email. Try again later.' }, { status: 503 });
        }
        if (!sent) {
            console.info('[forgot-password] dev mode — reset link logged for local testing only');
            console.info('[forgot-password] reset link:', link);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status, headers: { 'Retry-After': String(r.retryAfterSec) } });
        }
        console.error('forgot-password:', err);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}
