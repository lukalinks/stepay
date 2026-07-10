/**
 * Encrypt all plaintext wallet_secret values and clear the plaintext column.
 * Usage: node scripts/migrate-wallet-secrets.mjs
 * Requires DATABASE_URL and WALLET_ENCRYPTION_KEY in .env
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import postgres from 'postgres';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile() {
    try {
        const raw = readFileSync(join(root, '.env'), 'utf8');
        for (const line of raw.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eq = trimmed.indexOf('=');
            if (eq === -1) continue;
            const key = trimmed.slice(0, eq).trim();
            const value = trimmed.slice(eq + 1).trim();
            if (!process.env[key]) process.env[key] = value;
        }
    } catch {
        // optional
    }
}

function masterKey() {
    const raw = process.env.WALLET_ENCRYPTION_KEY?.trim();
    if (!raw) throw new Error('WALLET_ENCRYPTION_KEY is not configured');
    const buf = Buffer.from(raw, raw.length >= 44 ? 'base64' : 'utf8');
    if (buf.length < 32) return createHash('sha256').update(raw).digest();
    return buf.subarray(0, 32);
}

function encryptWalletSecret(plainSecret) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', masterKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plainSecret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

loadEnvFile();

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

const rows = await sql`
    SELECT id, wallet_secret, wallet_secret_enc
    FROM users
    WHERE wallet_secret IS NOT NULL AND wallet_secret != ''
      AND (wallet_secret_enc IS NULL OR wallet_secret_enc = '')
`;

console.log(`Found ${rows.length} user(s) to migrate`);

let migrated = 0;
for (const row of rows) {
    const enc = encryptWalletSecret(row.wallet_secret);
    await sql`
        UPDATE users
        SET wallet_secret_enc = ${enc}, wallet_secret = NULL, wallet_key_version = 1
        WHERE id = ${row.id}
    `;
    migrated++;
}

await sql.end();
console.log(`Migrated ${migrated} wallet secret(s) to encrypted storage.`);
