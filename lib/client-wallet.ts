/**
 * Non-custodial wallet vault — secret keys stay in the browser, encrypted with the user's password.
 * Server only stores wallet_public.
 */

import { Keypair } from '@stellar/stellar-sdk';

const STORAGE_KEY = 'stepay_wallet_v1';
/** Wallet stays unlocked on this device for 24 hours (refreshed on activity). */
export const UNLOCK_TTL_MS = 24 * 60 * 60 * 1000;

type StoredVault = {
    publicKey: string;
    salt: string;
    iv: string;
    ciphertext: string;
};

let sessionSecret: string | null = null;
let sessionPublicKey: string | null = null;
let sessionExpiresAt = 0;

/** Web Crypto (wallet encrypt/decrypt) requires a secure context — HTTPS or localhost. */
export function isSecureWalletContext(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(window.isSecureContext && window.crypto?.subtle);
}

function requireBrowser(): void {
    if (typeof window === 'undefined') {
        throw new Error('Wallet unlock is only available in the browser.');
    }
    if (!isSecureWalletContext()) {
        throw new Error(
            'Wallet unlock requires HTTPS. Open https://stepay.pro (not http) and try again.'
        );
    }
}

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
    return btoa(s);
}

function b64ToBuf(b64: string): Uint8Array {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const saltBuf = new Uint8Array(salt);
    const base = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: saltBuf, iterations: 120_000, hash: 'SHA-256' },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptSecret(secretKey: string, password: string): Promise<{ salt: string; iv: string; ciphertext: string }> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveAesKey(password, salt);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(secretKey));
    return {
        salt: bufToB64(salt),
        iv: bufToB64(iv),
        ciphertext: bufToB64(encrypted),
    };
}

function asBufferSource(bytes: Uint8Array): BufferSource {
    return new Uint8Array(bytes) as BufferSource;
}

async function decryptSecret(vault: StoredVault, password: string): Promise<string> {
    const key = await deriveAesKey(password, b64ToBuf(vault.salt));
    const iv = b64ToBuf(vault.iv);
    const ciphertext = b64ToBuf(vault.ciphertext);
    const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: asBufferSource(iv) },
        key,
        asBufferSource(ciphertext)
    );
    return new TextDecoder().decode(plain);
}

function readVault(): StoredVault | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as StoredVault;
    } catch {
        return null;
    }
}

function writeVault(vault: StoredVault): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
}

export function clearWalletSession(): void {
    sessionSecret = null;
    sessionPublicKey = null;
    sessionExpiresAt = 0;
}

export function isWalletUnlocked(): boolean {
    return Boolean(sessionSecret && Date.now() < sessionExpiresAt);
}

export function getUnlockedPublicKey(): string | null {
    return isWalletUnlocked() ? sessionPublicKey : null;
}

export function getUnlockedSecret(): string {
    if (!isWalletUnlocked() || !sessionSecret) {
        throw new Error('Unlock your wallet to continue.');
    }
    sessionExpiresAt = Date.now() + UNLOCK_TTL_MS;
    return sessionSecret;
}

export function hasLocalWallet(): boolean {
    return Boolean(readVault()?.publicKey);
}

export function getLocalWalletPublicKey(): string | null {
    return readVault()?.publicKey ?? null;
}

/** Create a new Stellar keypair and persist encrypted locally. Secret is not returned — reveal later from Profile. */
export async function createLocalWallet(password: string): Promise<{ publicKey: string }> {
    requireBrowser();
    const pair = Keypair.random();
    const publicKey = pair.publicKey();
    const secretKey = pair.secret();
    const enc = await encryptSecret(secretKey, password);
    writeVault({ publicKey, ...enc });
    sessionSecret = secretKey;
    sessionPublicKey = publicKey;
    sessionExpiresAt = Date.now() + UNLOCK_TTL_MS;
    return { publicKey };
}

/** Reveal the local secret after password confirmation (Profile export). */
export async function revealLocalWalletSecret(password: string): Promise<{ publicKey: string; secretKey: string }> {
    requireBrowser();
    const vault = readVault();
    if (!vault) {
        throw new Error('No wallet on this device. Import your secret key to continue.');
    }
    const secretKey = await decryptSecret(vault, password);
    const publicKey = Keypair.fromSecret(secretKey).publicKey();
    if (publicKey !== vault.publicKey) {
        throw new Error('Wallet data is corrupted. Import your secret key again.');
    }
    return { publicKey, secretKey };
}

export const BACKUP_REMINDER_KEY = 'stepay_backup_reminder_dismissed';
export const SECRET_REVEALED_KEY = 'stepay_secret_revealed';
export const ONBOARDING_SEEN_KEY = 'stepay_onboarding_seen';
export const UNLOCK_HINT_KEY = 'stepay_wallet_unlock_hint';

export function shouldShowBackupReminder(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(BACKUP_REMINDER_KEY) !== '1';
}

export function dismissBackupReminder(): void {
    localStorage.setItem(BACKUP_REMINDER_KEY, '1');
}

export function markSecretRevealed(): void {
    localStorage.setItem(SECRET_REVEALED_KEY, '1');
    dismissBackupReminder();
}

export function hasRevealedSecret(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SECRET_REVEALED_KEY) === '1';
}

/** Soft nudge on send/sell/swap when banner was dismissed but secret never viewed. */
export function shouldShowSoftBackupNudge(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(BACKUP_REMINDER_KEY) === '1' && !hasRevealedSecret();
}

export function markOnboardingSeen(): void {
    localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
}

export function shouldShowOnboardingChecklist(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(ONBOARDING_SEEN_KEY) !== '1';
}

export function setWalletUnlockHint(message: string): void {
    sessionStorage.setItem(UNLOCK_HINT_KEY, message);
}

export function consumeWalletUnlockHint(): string | null {
    const msg = sessionStorage.getItem(UNLOCK_HINT_KEY);
    if (msg) sessionStorage.removeItem(UNLOCK_HINT_KEY);
    return msg;
}

/** Extend unlock session on dashboard activity. */
export function touchWalletSession(): void {
    if (isWalletUnlocked()) {
        sessionExpiresAt = Date.now() + UNLOCK_TTL_MS;
    }
}

/** Import an existing secret (e.g. from Lobstr) into the local vault. */
export async function importLocalWallet(secretKey: string, password: string): Promise<{ publicKey: string }> {
    requireBrowser();
    const pair = Keypair.fromSecret(secretKey.trim());
    const publicKey = pair.publicKey();
    const enc = await encryptSecret(pair.secret(), password);
    writeVault({ publicKey, ...enc });
    sessionSecret = pair.secret();
    sessionPublicKey = publicKey;
    sessionExpiresAt = Date.now() + UNLOCK_TTL_MS;
    return { publicKey };
}

export async function unlockLocalWallet(password: string): Promise<{ publicKey: string }> {
    requireBrowser();
    const vault = readVault();
    if (!vault) {
        throw new Error('No wallet on this device. Sign up again or import your secret key.');
    }
    const secretKey = await decryptSecret(vault, password);
    const publicKey = Keypair.fromSecret(secretKey).publicKey();
    if (publicKey !== vault.publicKey) {
        throw new Error('Wallet data is corrupted. Import your secret key again.');
    }
    sessionSecret = secretKey;
    sessionPublicKey = publicKey;
    sessionExpiresAt = Date.now() + UNLOCK_TTL_MS;
    return { publicKey };
}

export function removeLocalWallet(): void {
    localStorage.removeItem(STORAGE_KEY);
    clearWalletSession();
}

export type WalletVaultSnapshot = StoredVault;

/** Export encrypted vault for cloud backup (password-encrypted blob — server cannot read secret). */
export function exportVaultForBackup(): WalletVaultSnapshot | null {
    return readVault();
}

/** Restore vault from cloud backup ciphertext and unlock with account password. */
export async function restoreVaultFromBackup(
    vault: WalletVaultSnapshot,
    password: string
): Promise<{ publicKey: string }> {
    requireBrowser();
    writeVault(vault);
    return unlockLocalWallet(password);
}

/** Clear all browser-stored data for the current account (call on logout or before signup). */
export function clearAccountLocalState(): void {
    removeLocalWallet();
    if (typeof window === 'undefined') return;
    localStorage.removeItem(BACKUP_REMINDER_KEY);
    localStorage.removeItem(SECRET_REVEALED_KEY);
    localStorage.removeItem(ONBOARDING_SEEN_KEY);
    sessionStorage.removeItem(UNLOCK_HINT_KEY);
    sessionStorage.removeItem('stepay_active_user_id');
    sessionStorage.removeItem('stepay_expected_user_id');
}

export function isValidStellarPublicKey(key: string): boolean {
    return /^G[A-Z2-7]{55}$/.test(key.trim());
}

export function isValidStellarSecretKey(key: string): boolean {
    return /^S[A-Z2-7]{55}$/.test(key.trim());
}
