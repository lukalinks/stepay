'use client';

import { Keypair, Networks, TransactionBuilder } from '@stellar/stellar-sdk';

/**
 * Client-side SEP-10: fetch challenge, sign with secret, exchange for token.
 */
export async function proveWalletWithSep10(secretKey: string): Promise<{
    token: string;
    account: string;
}> {
    const keypair = Keypair.fromSecret(secretKey);
    const account = keypair.publicKey();

    const challengeRes = await fetch(`/api/sep10/auth?account=${encodeURIComponent(account)}`, {
        credentials: 'omit',
    });
    const challenge = await challengeRes.json().catch(() => ({}));
    if (!challengeRes.ok || !challenge.transaction) {
        throw new Error(challenge.error || 'Could not start wallet verification');
    }

    const network =
        typeof challenge.network_passphrase === 'string' && challenge.network_passphrase.includes('Test')
            ? Networks.TESTNET
            : Networks.PUBLIC;

    const tx = TransactionBuilder.fromXDR(challenge.transaction, network);
    if (!('sign' in tx) || typeof tx.sign !== 'function') {
        throw new Error('Invalid SEP-10 challenge');
    }
    tx.sign(keypair);
    const signed = tx.toXDR();

    const tokenRes = await fetch('/api/sep10/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({ transaction: signed }),
    });
    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenData.token) {
        throw new Error(tokenData.error || 'Wallet verification failed');
    }

    return { token: String(tokenData.token), account: String(tokenData.account || account) };
}
