import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { clientIp } from '@/lib/signer';
import { verifyBackupKeyProof } from '@/lib/wallet-backup-proof';
import {
    parseWalletVaultBackup,
    serializeWalletVaultBackup,
    validateVaultMatchesPublic,
} from '@/lib/wallet-backup-server';
import {
    createWalletEmailVerification,
    verifyWalletEmailCode,
} from '@/lib/wallet-restore-verify';

async function loadUserEmail(userId: string): Promise<string | null> {
    const rows = await sql`SELECT email FROM users WHERE id = ${userId} LIMIT 1`;
    const email = (rows[0] as { email: string | null } | undefined)?.email;
    return email?.trim() || null;
}

async function loadBackupStatus(userId: string) {
    const rows = await sql`
        SELECT wallet_public, wallet_backup_enc, wallet_backup_enabled,
               wallet_secret_enc, wallet_secret
        FROM users WHERE id = ${userId} LIMIT 1
    `;
    const user = rows[0] as
        | {
              wallet_public: string;
              wallet_backup_enc: string | null;
              wallet_backup_enabled: boolean;
              wallet_secret_enc: string | null;
              wallet_secret: string | null;
          }
        | undefined;
    if (!user) return null;

    const isHosted = Boolean(user.wallet_secret_enc?.trim() || user.wallet_secret?.trim());
    const hasBackup = Boolean(user.wallet_backup_enabled && user.wallet_backup_enc?.trim());

    return {
        cloudBackupEnabled: Boolean(user.wallet_backup_enabled),
        hasCloudBackup: hasBackup,
        isHosted,
        walletPublic: user.wallet_public,
    };
}

export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await assertRateLimit(rateLimitKey('wallet-backup-status', [userId]), 60, 60 * 60 * 1000);

        const status = await loadBackupStatus(userId);
        if (!status) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(status);
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status, headers: { 'Retry-After': String(r.retryAfterSec) } });
        }
        console.error('Wallet backup GET error:', err);
        return NextResponse.json({ error: 'Failed to load backup status' }, { status: 500 });
    }
}

/** Upload encrypted vault — requires email OTP + Stellar key signature proving ownership. */
export async function PUT(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('wallet-backup-upload', [userId]), 10, 60 * 60 * 1000);

        const body = await request.json().catch(() => ({}));
        const confirmCode = typeof body.confirmCode === 'string' ? body.confirmCode : '';
        const keyProof = typeof body.keyProof === 'string' ? body.keyProof : '';
        const challengeNonce = typeof body.challengeNonce === 'string' ? body.challengeNonce : '';

        if (!confirmCode || !keyProof || !challengeNonce) {
            return NextResponse.json(
                { error: 'Email verification code, challenge, and wallet signature are required.' },
                { status: 400 }
            );
        }

        const vault = parseWalletVaultBackup(body.vault ?? body.walletBackup);
        if (!vault) {
            return NextResponse.json({ error: 'Invalid wallet backup payload.' }, { status: 400 });
        }

        const rows = await sql`
            SELECT wallet_public, wallet_secret_enc, wallet_secret FROM users WHERE id = ${userId} LIMIT 1
        `;
        const user = rows[0] as { wallet_public: string; wallet_secret_enc: string | null; wallet_secret: string | null } | undefined;
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.wallet_secret_enc || user.wallet_secret?.trim()) {
            return NextResponse.json({ error: 'Hosted wallets use server export instead of cloud backup.' }, { status: 400 });
        }

        if (!validateVaultMatchesPublic(vault, user.wallet_public)) {
            return NextResponse.json({ error: 'Backup does not match your account wallet address.' }, { status: 400 });
        }

        await verifyWalletEmailCode(userId, confirmCode, 'backup-upload');

        if (!verifyBackupKeyProof(user.wallet_public, challengeNonce, keyProof)) {
            return NextResponse.json(
                { error: 'Wallet signature invalid. Unlock your wallet and try again.' },
                { status: 400 }
            );
        }

        const serialized = serializeWalletVaultBackup(vault);
        await sql`
            UPDATE users
            SET wallet_backup_enc = ${serialized}, wallet_backup_enabled = true, updated_at = NOW()
            WHERE id = ${userId}
        `;

        return NextResponse.json({ success: true, cloudBackupEnabled: true, hasCloudBackup: true });
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status, headers: { 'Retry-After': String(r.retryAfterSec) } });
        }
        const msg = err instanceof Error ? err.message : 'Failed to save backup';
        const status =
            msg.includes('Incorrect') || msg.includes('expired') || msg.includes('Too many') || msg.includes('6-digit')
                ? 400
                : 500;
        console.error('Wallet backup PUT error:', err);
        return NextResponse.json({ error: msg }, { status });
    }
}

/** Disable cloud backup — requires email OTP. */
export async function DELETE(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await assertRateLimit(rateLimitKey('wallet-backup-delete', [userId]), 10, 60 * 60 * 1000);

        const body = await request.json().catch(() => ({}));
        const confirmCode = typeof body.confirmCode === 'string' ? body.confirmCode : '';
        if (!confirmCode) {
            return NextResponse.json({ error: 'Email verification code is required.' }, { status: 400 });
        }

        await verifyWalletEmailCode(userId, confirmCode, 'backup-delete');

        await sql`
            UPDATE users
            SET wallet_backup_enc = NULL, wallet_backup_enabled = false, updated_at = NOW()
            WHERE id = ${userId}
        `;

        return NextResponse.json({ success: true, cloudBackupEnabled: false, hasCloudBackup: false });
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status, headers: { 'Retry-After': String(r.retryAfterSec) } });
        }
        const msg = err instanceof Error ? err.message : 'Failed to disable backup';
        const status =
            msg.includes('Incorrect') || msg.includes('expired') || msg.includes('Too many') || msg.includes('6-digit')
                ? 400
                : 500;
        console.error('Wallet backup DELETE error:', err);
        return NextResponse.json({ error: msg }, { status });
    }
}

/** POST actions: restore intent/verify, upload-intent, delete-intent */
export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ip = clientIp(request) || 'unknown';
        const body = await request.json().catch(() => ({}));
        const action = typeof body.action === 'string' ? body.action : '';

        if (action === 'intent' || action === 'restore-intent') {
            await assertRateLimit(rateLimitKey('wallet-restore-intent', [userId]), 5, 60 * 60 * 1000);
            await assertRateLimit(rateLimitKey('wallet-restore-intent-ip', [ip]), 15, 60 * 60 * 1000);

            const rows = await sql`
                SELECT email, wallet_backup_enc, wallet_backup_enabled
                FROM users WHERE id = ${userId} LIMIT 1
            `;
            const user = rows[0] as
                | { email: string | null; wallet_backup_enc: string | null; wallet_backup_enabled: boolean }
                | undefined;
            if (!user?.email?.trim()) {
                return NextResponse.json({ error: 'Email not found on account.' }, { status: 400 });
            }
            if (!user.wallet_backup_enabled || !user.wallet_backup_enc?.trim()) {
                return NextResponse.json({ error: 'Cloud backup is not enabled for this account.' }, { status: 400 });
            }

            const result = await createWalletEmailVerification(userId, user.email.trim(), 'restore');
            return NextResponse.json({ success: true, ...result, restoreId: result.verificationId });
        }

        if (action === 'verify' || action === 'restore-verify') {
            await assertRateLimit(rateLimitKey('wallet-restore-verify', [userId]), 15, 60 * 60 * 1000);

            const code = typeof body.code === 'string' ? body.code : '';
            await verifyWalletEmailCode(userId, code, 'restore');

            const rows = await sql`
                SELECT wallet_backup_enc FROM users
                WHERE id = ${userId} AND wallet_backup_enabled = true
                LIMIT 1
            `;
            const enc = (rows[0] as { wallet_backup_enc: string | null } | undefined)?.wallet_backup_enc;
            if (!enc?.trim()) {
                return NextResponse.json({ error: 'No backup found.' }, { status: 404 });
            }

            let vault: unknown;
            try {
                vault = JSON.parse(enc);
            } catch {
                return NextResponse.json({ error: 'Backup data is corrupted.' }, { status: 500 });
            }

            return NextResponse.json({ success: true, vault });
        }

        if (action === 'upload-intent') {
            await assertRateLimit(rateLimitKey('wallet-backup-upload-intent', [userId]), 5, 60 * 60 * 1000);
            await assertRateLimit(rateLimitKey('wallet-backup-upload-intent-ip', [ip]), 15, 60 * 60 * 1000);

            const email = await loadUserEmail(userId);
            if (!email) {
                return NextResponse.json({ error: 'Email not found on account.' }, { status: 400 });
            }

            const result = await createWalletEmailVerification(userId, email, 'backup-upload');
            return NextResponse.json({ success: true, ...result });
        }

        if (action === 'delete-intent') {
            await assertRateLimit(rateLimitKey('wallet-backup-delete-intent', [userId]), 5, 60 * 60 * 1000);
            await assertRateLimit(rateLimitKey('wallet-backup-delete-intent-ip', [ip]), 15, 60 * 60 * 1000);

            const email = await loadUserEmail(userId);
            if (!email) {
                return NextResponse.json({ error: 'Email not found on account.' }, { status: 400 });
            }

            const result = await createWalletEmailVerification(userId, email, 'backup-delete');
            return NextResponse.json({ success: true, ...result });
        }

        return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status, headers: { 'Retry-After': String(r.retryAfterSec) } });
        }
        const msg = err instanceof Error ? err.message : 'Request failed';
        const status =
            msg.includes('Incorrect') || msg.includes('expired') || msg.includes('Too many') || msg.includes('6-digit')
                ? 400
                : 500;
        return NextResponse.json({ error: msg }, { status });
    }
}
