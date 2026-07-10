import { createHash, randomBytes } from 'crypto';
import { sql } from '@/lib/db';

export type MerchantApiKeyRow = {
    id: string;
    user_id: string;
    name: string;
    key_prefix: string;
    webhook_secret: string;
};

function hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
    const suffix = randomBytes(24).toString('base64url');
    const key = `sk_live_${suffix}`;
    const prefix = key.slice(0, 16);
    return { key, prefix, hash: hashApiKey(key) };
}

export function generateWebhookSecret(): string {
    return `whsec_${randomBytes(24).toString('base64url')}`;
}

export async function createMerchantApiKey(
    userId: string,
    name: string
): Promise<{ id: string; key: string; prefix: string; webhookSecret: string }> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('API key name is required.');

    const { key, prefix, hash } = generateApiKey();
    const webhookSecret = generateWebhookSecret();

    const rows = await sql`
        INSERT INTO merchant_api_keys (user_id, name, key_prefix, key_hash, webhook_secret)
        VALUES (${userId}, ${trimmed}, ${prefix}, ${hash}, ${webhookSecret})
        RETURNING id
    `;
    const id = (rows[0] as { id: string }).id;
    return { id, key, prefix, webhookSecret };
}

export async function listMerchantApiKeys(userId: string) {
    const rows = await sql`
        SELECT id, name, key_prefix, webhook_secret, last_used_at, revoked_at, created_at
        FROM merchant_api_keys
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
    `;
    return rows.map((row) => {
        const r = row as Record<string, unknown>;
        return {
            id: r.id,
            name: r.name,
            prefix: r.key_prefix,
            webhookSecretPreview: r.revoked_at ? null : String(r.webhook_secret).slice(0, 12) + '…',
            lastUsedAt: r.last_used_at,
            revokedAt: r.revoked_at,
            createdAt: r.created_at,
        };
    });
}

export async function revokeMerchantApiKey(userId: string, keyId: string): Promise<boolean> {
    const rows = await sql`
        UPDATE merchant_api_keys
        SET revoked_at = NOW()
        WHERE id = ${keyId} AND user_id = ${userId} AND revoked_at IS NULL
        RETURNING id
    `;
    return rows.length > 0;
}

export async function authenticateMerchantApiKey(request: Request): Promise<MerchantApiKeyRow | null> {
    const header =
        request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
        request.headers.get('x-stepay-key')?.trim();
    if (!header || !header.startsWith('sk_live_')) return null;

    const hash = hashApiKey(header);
    const rows = await sql`
        SELECT id, user_id, name, key_prefix, webhook_secret
        FROM merchant_api_keys
        WHERE key_hash = ${hash} AND revoked_at IS NULL
        LIMIT 1
    `;
    const row = rows[0] as MerchantApiKeyRow | undefined;
    if (!row) return null;

    await sql`UPDATE merchant_api_keys SET last_used_at = NOW() WHERE id = ${row.id}`;
    return row;
}
