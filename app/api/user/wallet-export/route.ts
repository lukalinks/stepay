import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { sql } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { auditSign, clientIp, getUserWalletSecret, loadUserWalletRow } from '@/lib/signer';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { createWalletEmailVerification, verifyWalletEmailCode } from '@/lib/wallet-restore-verify';
import { hasServerStoredSecret } from '@/lib/wallet-custody';

export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ip = clientIp(request) || 'unknown';
        const body = await request.json().catch(() => ({}));
        const action = typeof body.action === 'string' ? body.action : 'export';

        if (action === 'intent') {
            if (!(await hasServerStoredSecret(userId))) {
                return NextResponse.json(
                    { error: 'Self-custody wallets export from this device only. Use Settings on the device where your wallet is stored.' },
                    { status: 400 }
                );
            }

            await assertRateLimit(rateLimitKey('wallet-export-intent', [userId]), 5, 60 * 60 * 1000);
            await assertRateLimit(rateLimitKey('wallet-export-intent-ip', [ip]), 10, 60 * 60 * 1000);

            const rows = await sql`SELECT email FROM users WHERE id = ${userId} LIMIT 1`;
            const email = (rows[0] as { email: string | null } | undefined)?.email?.trim();
            if (!email) {
                return NextResponse.json({ error: 'Email not found on account.' }, { status: 400 });
            }

            const result = await createWalletEmailVerification(userId, email, 'wallet-export');
            return NextResponse.json({ success: true, ...result });
        }

        await assertRateLimit(rateLimitKey('wallet-export', [userId]), 5, 60 * 60 * 1000);
        await assertRateLimit(rateLimitKey('wallet-export-ip', [ip]), 10, 60 * 60 * 1000);

        const password = typeof body.password === 'string' ? body.password : '';
        const confirmCode = typeof body.confirmCode === 'string' ? body.confirmCode : '';
        if (!password) {
            return NextResponse.json({ error: 'Password is required to export your wallet.' }, { status: 400 });
        }
        if (!confirmCode) {
            return NextResponse.json({ error: 'Email verification code is required.' }, { status: 400 });
        }

        if (!(await hasServerStoredSecret(userId))) {
            return NextResponse.json(
                { error: 'Self-custody wallets export from this device only. Use Settings on the device where your wallet is stored.' },
                { status: 400 }
            );
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

        await verifyWalletEmailCode(userId, confirmCode, 'wallet-export');

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
        const msg = err instanceof Error ? err.message : 'Failed to export wallet';
        const status =
            msg.includes('Incorrect') || msg.includes('expired') || msg.includes('Too many') || msg.includes('6-digit')
                ? 400
                : msg.includes('Self-custody') || msg.includes('device only')
                  ? 400
                  : 500;
        console.error('Wallet export error:', err);
        return NextResponse.json({ error: msg }, { status });
    }
}
