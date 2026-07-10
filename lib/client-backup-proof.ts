'use client';

import { BACKUP_PROOF_PREFIX } from '@/lib/wallet-backup-proof';
import { getUnlockedSecret } from '@/lib/client-wallet';

/** Sign upload challenge with unlocked wallet secret (proves vault ownership). */
export async function signBackupUploadProof(nonce: string): Promise<string> {
    const secret = getUnlockedSecret();
    const StellarSdk = await import('@stellar/stellar-sdk');
    const kp = StellarSdk.Keypair.fromSecret(secret);
    const sig = kp.sign(Buffer.from(`${BACKUP_PROOF_PREFIX}${nonce}`));
    return Buffer.from(sig).toString('base64');
}
