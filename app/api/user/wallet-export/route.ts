import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { sql } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { auditSign, clientIp, getUserWalletSecret, loadUserWalletRow } from '@/lib/signer';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('wallet-export', [userId]), 5, 60 * 60 * 1000);
        await assertRateLimit(rateLimitKey('wallet-export-ip', [ip]), 10, 60 * 60 * 1000);

        const body = await request.json().catch(() => ({}));
        const password = typeof body.password === 'string' ? body.password : '';
        if (!password) {
            return NextResponse.json({ error: 'Password is required to export your wallet.' }, { status: 400 });
        }

        const rows = await sql`
            SELECT password_hash, wallet_public FROM users WHERE id = ${userId} LIMIT 1
        `;
        const user = rows[0] as { password_hash?: string | null; wallet_public: string } | undefined;
        if (!user?.password_hash) {
            return NextResponse.json({ error: 'Password login is not configured for this account.' }, { status: 400 });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            await assertRateLimit(rateLimitKey('wallet-export-fail', [userId]), 10, 60 * 60 * 1000);
            return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
        }

        const wallet = await loadUserWalletRow(userId);
        if (!wallet) {
            return NextResponse.json({ error: 'Wallet not found.' }, { status: 404 });
        }

        const secret = await getUserWalletSecret(userId);

        await auditSign({
            userId,
            reason: 'export',
            intentId: null,
            txHash: null,
            ip,
        });

        return NextResponse.json({
            publicKey: user.wallet_public,
            secretKey: secret,
            warning: 'Anyone with this secret can control your funds. Store it offline and never share it.',
        });
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status, headers: { 'Retry-After': String(r.retryAfterSec) } });
        }
        console.error('Wallet export error:', err);
        return NextResponse.json({ error: 'Failed to export wallet.' }, { status: 500 });
    }
}
