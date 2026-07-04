import { sql } from '@/lib/db';
import type { DbUser } from '@/lib/db-types';
import { decryptWalletSecret, encryptWalletSecret } from '@/lib/wallet-crypto';

export type SignReason = 'send' | 'sell' | 'swap' | 'trustline' | 'export';

type UserWalletRow = Pick<DbUser, 'id' | 'wallet_secret' | 'wallet_public'> & {
    wallet_secret_enc?: string | null;
};

export async function loadUserWalletRow(userId: string): Promise<UserWalletRow | null> {
    const rows = await sql`
        SELECT id, wallet_public, wallet_secret, wallet_secret_enc
        FROM users WHERE id = ${userId} LIMIT 1
    `;
    return (rows[0] as UserWalletRow | undefined) ?? null;
}

export async function resolveUserWalletSecret(user: UserWalletRow): Promise<string> {
    if (user.wallet_secret_enc) {
        return decryptWalletSecret(user.wallet_secret_enc);
    }
    if (user.wallet_secret) {
        if (process.env.WALLET_ENCRYPTION_KEY?.trim()) {
            const enc = encryptWalletSecret(user.wallet_secret);
            await sql`
                UPDATE users
                SET wallet_secret_enc = ${enc}, wallet_secret = NULL, wallet_key_version = 1
                WHERE id = ${user.id}
            `;
        }
        return user.wallet_secret;
    }
    throw new Error('Wallet secret not found');
}

export async function storeEncryptedWalletSecret(userId: string, secret: string): Promise<void> {
    const enc = encryptWalletSecret(secret);
    await sql`
        UPDATE users
        SET wallet_secret_enc = ${enc}, wallet_secret = NULL, wallet_key_version = 1
        WHERE id = ${userId}
    `;
}

export async function auditSign(opts: {
    userId: string;
    reason: SignReason;
    intentId?: string | null;
    txHash?: string | null;
    ip?: string | null;
}): Promise<void> {
    await sql`
        INSERT INTO sign_audit_log (user_id, intent_id, reason, tx_hash, ip)
        VALUES (
            ${opts.userId},
            ${opts.intentId ?? null},
            ${opts.reason},
            ${opts.txHash ?? null},
            ${opts.ip ?? null}
        )
    `;
}

export async function getUserWalletSecret(userId: string): Promise<string> {
    const user = await loadUserWalletRow(userId);
    if (!user) {
        throw new Error('User not found');
    }
    return resolveUserWalletSecret(user);
}

/** Daily outbound count guard (send + sell + swap intents confirmed today). */
export async function assertDailySignLimit(userId: string, maxPerDay = 50): Promise<void> {
    const rows = await sql`
        SELECT COUNT(*)::int AS c FROM sign_audit_log
        WHERE user_id = ${userId}
          AND reason IN ('send', 'sell', 'swap')
          AND created_at >= NOW() - INTERVAL '1 day'
    `;
    const count = Number((rows[0] as { c: number })?.c ?? 0);
    if (count >= maxPerDay) {
        throw new Error('Daily transaction limit reached. Try again tomorrow or contact support.');
    }
}

export function clientIp(request: Request): string | null {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        null
    );
}
