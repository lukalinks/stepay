import { loadUserWalletRow } from '@/lib/signer';

export function isValidStellarPublicKey(key: string): boolean {
    return /^G[A-Z2-7]{55}$/.test(key.trim());
}

export async function hasServerStoredSecret(userId: string): Promise<boolean> {
    const user = await loadUserWalletRow(userId);
    if (!user) return false;
    return Boolean(user.wallet_secret_enc?.trim() || user.wallet_secret?.trim());
}

export async function getWalletCustody(userId: string): Promise<'self' | 'hosted'> {
    return (await hasServerStoredSecret(userId)) ? 'hosted' : 'self';
}
