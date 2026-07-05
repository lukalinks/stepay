import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import bcrypt from 'bcrypt';
import { sql } from '@/lib/db';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { clientIp } from '@/lib/signer';
import { validatePassword } from '@/lib/password-policy';
import { incrementSessionTokenVersion } from '@/lib/session-token';

export async function POST(request: Request) {
    try {
        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('reset-password', [ip]), 10, 60 * 60 * 1000);

        const body = await request.json();
        const token = typeof body.token === 'string' ? body.token.trim() : '';
        const password = typeof body.password === 'string' ? body.password : '';

        const passwordErr = validatePassword(password);
        if (!token || passwordErr) {
            return NextResponse.json(
                { error: passwordErr || 'Invalid reset link.' },
                { status: 400 }
            );
        }

        const tokenHash = createHash('sha256').update(token).digest('hex');
        const rows = await sql`
            SELECT user_id FROM password_reset_tokens
            WHERE token_hash = ${tokenHash} AND expires_at > NOW()
            LIMIT 1
        `;
        const row = rows[0] as { user_id: string } | undefined;
        if (!row) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${row.user_id}`;
        await sql`DELETE FROM password_reset_tokens WHERE user_id = ${row.user_id}`;
        await incrementSessionTokenVersion(row.user_id);

        return NextResponse.json({ success: true });
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status, headers: { 'Retry-After': String(r.retryAfterSec) } });
        }
        console.error('reset-password:', err);
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
