import { isValidStellarPublicKey } from '@/lib/wallet-custody';

/** Client vault blob stored in wallet_backup_enc (same shape as stepay_wallet_v1). */
export type WalletVaultBackup = {
    publicKey: string;
    salt: string;
    iv: string;
    ciphertext: string;
};

export function parseWalletVaultBackup(raw: unknown): WalletVaultBackup | null {
    if (!raw || typeof raw !== 'object') return null;
    const v = raw as Record<string, unknown>;
    const publicKey = typeof v.publicKey === 'string' ? v.publicKey.trim() : '';
    const salt = typeof v.salt === 'string' ? v.salt.trim() : '';
    const iv = typeof v.iv === 'string' ? v.iv.trim() : '';
    const ciphertext = typeof v.ciphertext === 'string' ? v.ciphertext.trim() : '';
    if (!publicKey || !salt || !iv || !ciphertext) return null;
    if (!isValidStellarPublicKey(publicKey)) return null;
    return { publicKey, salt, iv, ciphertext };
}

export function validateVaultMatchesPublic(vault: WalletVaultBackup, walletPublic: string): boolean {
    return vault.publicKey.trim().toUpperCase() === walletPublic.trim().toUpperCase();
}

export function serializeWalletVaultBackup(vault: WalletVaultBackup): string {
    return JSON.stringify(vault);
}

export function deserializeWalletVaultBackup(stored: string | null | undefined): WalletVaultBackup | null {
    if (!stored?.trim()) return null;
    try {
        return parseWalletVaultBackup(JSON.parse(stored));
    } catch {
        return null;
    }
}
