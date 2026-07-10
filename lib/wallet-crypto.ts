import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const PREFIX = 'v1';

function masterKey(): Buffer {
    const raw = process.env.WALLET_ENCRYPTION_KEY?.trim();
    if (!raw) {
        throw new Error('WALLET_ENCRYPTION_KEY is not configured');
    }
    const buf = Buffer.from(raw, raw.length >= 44 ? 'base64' : 'utf8');
    if (buf.length < 32) {
        return createHash('sha256').update(raw).digest();
    }
    return buf.subarray(0, 32);
}

/** Encrypt a Stellar secret for storage. Returns `v1:iv:tag:ciphertext` (base64 segments). */
export function encryptWalletSecret(plainSecret: string): string {
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, masterKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plainSecret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [PREFIX, iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptWalletSecret(enc: string): string {
    const parts = enc.split(':');
    if (parts.length !== 4 || parts[0] !== PREFIX) {
        throw new Error('Invalid encrypted wallet format');
    }
    const iv = Buffer.from(parts[1], 'base64');
    const tag = Buffer.from(parts[2], 'base64');
    const data = Buffer.from(parts[3], 'base64');
    const decipher = createDecipheriv(ALGO, masterKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function hashConfirmCode(code: string, salt: string): string {
    return createHash('sha256').update(`${salt}:${code}`).digest('hex');
}

export function generateConfirmCode(): string {
    return String(randomInt(100000, 1000000));
}
