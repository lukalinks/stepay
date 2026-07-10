import { randomBytes } from 'node:crypto';
import { sql } from '@/lib/db';
import { deliverConfirmCode } from '@/lib/confirm-delivery';
import { generateConfirmCode, hashConfirmCode } from '@/lib/wallet-crypto';

const VERIFY_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export type WalletEmailPurpose = 'restore' | 'backup-upload' | 'backup-delete' | 'wallet-export';

const EMAIL_ACTION: Record<WalletEmailPurpose, Parameters<typeof deliverConfirmCode>[2]> = {
    restore: 'wallet-restore',
    'backup-upload': 'wallet-backup-upload',
    'backup-delete': 'wallet-backup-delete',
    'wallet-export': 'wallet-export',
};

export async function createWalletEmailVerification(userId: string, email: string, purpose: WalletEmailPurpose) {
    const confirmCode = generateConfirmCode();
    const salt = `${userId}:${Date.now()}`;
    const confirmCodeHash = `${salt}|${hashConfirmCode(confirmCode, salt)}`;
    const expiresAt = new Date(Date.now() + VERIFY_TTL_MS).toISOString();
    const challengeNonce =
        purpose === 'backup-upload' ? randomBytes(24).toString('base64url') : null;

    await sql`
        DELETE FROM wallet_restore_verifications
        WHERE user_id = ${userId} AND purpose = ${purpose}
    `;

    const rows = await sql`
        INSERT INTO wallet_restore_verifications (user_id, confirm_code_hash, expires_at, purpose, challenge_nonce)
        VALUES (${userId}, ${confirmCodeHash}, ${expiresAt}, ${purpose}, ${challengeNonce})
        RETURNING id, challenge_nonce
    `;

    const { delivery, maskedEmail } = await deliverConfirmCode(email, confirmCode, EMAIL_ACTION[purpose]);

    return {
        verificationId: String((rows[0] as { id: string }).id),
        challengeNonce: (rows[0] as { challenge_nonce: string | null }).challenge_nonce ?? undefined,
        delivery,
        maskedEmail,
        ...(delivery === 'dev' ? { devConfirmCode: confirmCode } : {}),
    };
}

export async function verifyWalletEmailCode(
    userId: string,
    code: string,
    purpose: WalletEmailPurpose
): Promise<{ challengeNonce?: string }> {
    const normalizedCode = code.replace(/\D/g, '');
    if (normalizedCode.length !== 6) {
        throw new Error('Please enter the 6-digit code from your email.');
    }

    const rows = await sql`
        SELECT id, confirm_code_hash, attempts, expires_at, challenge_nonce
        FROM wallet_restore_verifications
        WHERE user_id = ${userId} AND purpose = ${purpose}
        ORDER BY created_at DESC
        LIMIT 1
    `;
    const row = rows[0] as
        | {
              id: string;
              confirm_code_hash: string;
              attempts: number;
              expires_at: string;
              challenge_nonce: string | null;
          }
        | undefined;

    if (!row) {
        throw new Error('No verification request found. Please request a new code.');
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
        await sql`DELETE FROM wallet_restore_verifications WHERE id = ${row.id}`;
        throw new Error('Verification code expired. Please request a new code.');
    }

    const attempts = Number(row.attempts) + 1;
    if (attempts > MAX_ATTEMPTS) {
        await sql`DELETE FROM wallet_restore_verifications WHERE id = ${row.id}`;
        throw new Error('Too many incorrect attempts. Please request a new code.');
    }

    const [salt, expectedHash] = row.confirm_code_hash.split('|');
    const actualHash = hashConfirmCode(normalizedCode, salt);
    if (actualHash !== expectedHash) {
        await sql`
            UPDATE wallet_restore_verifications SET attempts = ${attempts} WHERE id = ${row.id}
        `;
        throw new Error('Incorrect verification code.');
    }

    const challengeNonce = row.challenge_nonce?.trim() || undefined;
    await sql`DELETE FROM wallet_restore_verifications WHERE id = ${row.id}`;

    return { challengeNonce };
}

/** @deprecated use createWalletEmailVerification */
export async function createWalletRestoreVerification(userId: string, email: string) {
    const result = await createWalletEmailVerification(userId, email, 'restore');
    return {
        restoreId: result.verificationId,
        delivery: result.delivery,
        maskedEmail: result.maskedEmail,
        ...(result.devConfirmCode ? { devConfirmCode: result.devConfirmCode } : {}),
    };
}

/** @deprecated use verifyWalletEmailCode */
export async function verifyWalletRestoreCode(userId: string, code: string): Promise<void> {
    await verifyWalletEmailCode(userId, code, 'restore');
}
