import { Keypair } from '@stellar/stellar-sdk';

export const BACKUP_PROOF_PREFIX = 'stepay-backup:';

export function backupProofMessage(nonce: string): string {
    return `${BACKUP_PROOF_PREFIX}${nonce}`;
}

/** Verify client signed the upload challenge with the wallet matching walletPublic. */
export function verifyBackupKeyProof(walletPublic: string, nonce: string, signatureB64: string): boolean {
    if (!nonce?.trim() || !signatureB64?.trim() || !walletPublic?.trim()) return false;
    try {
        const kp = Keypair.fromPublicKey(walletPublic.trim());
        const sig = Buffer.from(signatureB64.trim(), 'base64');
        return kp.verify(Buffer.from(backupProofMessage(nonce)), sig);
    } catch {
        return false;
    }
}
