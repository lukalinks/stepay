import { NextResponse } from 'next/server';
import { issueAuthJwt } from '@/lib/issue-jwt';
import { setSessionCookie } from '@/lib/session-cookies';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { clientIp } from '@/lib/signer';
import { verifySignupAndCreateUser } from '@/lib/signup-verify';
import {
    parseWalletVaultBackup,
    serializeWalletVaultBackup,
    validateVaultMatchesPublic,
} from '@/lib/wallet-backup-server';

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const signupId = typeof body.signupId === 'string' ? body.signupId.trim() : '';
        const code = typeof body.code === 'string' ? body.code : '';
        const walletPublic = typeof body.walletPublic === 'string' ? body.walletPublic.trim() : '';

        if (!signupId) {
            return NextResponse.json({ error: 'Missing signup session. Please start again.' }, { status: 400 });
        }
        if (!walletPublic) {
            return NextResponse.json({ error: 'Wallet setup failed. Please try again.' }, { status: 400 });
        }

        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('signup-verify', [ip, signupId]), 15, 60 * 60 * 1000);

        if (!process.env.AUTH_SECRET?.trim()) {
            return NextResponse.json(
                { error: 'Server auth not configured. Add AUTH_SECRET to environment variables.' },
                { status: 500 }
            );
        }

        const cloudBackupEnabled = body.cloudBackupEnabled !== false;
        let walletBackupEnc: string | null = null;
        if (cloudBackupEnabled) {
            const vault = parseWalletVaultBackup(body.walletBackup);
            if (!vault || !validateVaultMatchesPublic(vault, walletPublic)) {
                return NextResponse.json(
                    { error: 'Wallet backup failed. Please try again or turn off cloud backup.' },
                    { status: 400 }
                );
            }
            walletBackupEnc = serializeWalletVaultBackup(vault);
        }

        const { userId, email } = await verifySignupAndCreateUser(signupId, code, walletPublic, {
            walletBackupEnc,
            cloudBackupEnabled,
        });

        const token = await issueAuthJwt({
            id: userId,
            email,
            role: 'user',
        });

        let isMobile = false;
        try {
            const url = new URL(request.url);
            isMobile = url.searchParams.get('client') === 'mobile';
        } catch {
            // ignore
        }

        if (isMobile) {
            return NextResponse.json({
                success: true,
                accessToken: token,
                refreshToken: token,
            });
        }

        const response = NextResponse.json({ success: true, userId, email });
        setSessionCookie(response, token);
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
            msg.includes('already exists') ||
            msg.includes('wallet') ||
            msg.includes('6-digit') ||
            msg.includes('not found')
                ? 400
                : 500;
        if (status === 500) console.error('Signup verify error:', err);
        return NextResponse.json({ error: msg }, { status });
    }
}
