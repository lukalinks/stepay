'use client';

import { Keypair, Networks, TransactionBuilder } from '@stellar/stellar-sdk';
import { clientSendPayment } from '@/lib/client-stellar';

export type Sep24TxStatus = {
    id: string;
    kind?: string;
    status: string;
    status_eta?: number;
    more_info_url?: string;
    amount_in?: string;
    amount_out?: string;
    amount_fee?: string;
    withdraw_anchor_account?: string;
    withdraw_memo?: string;
    withdraw_memo_type?: string;
    stellar_transaction_id?: string;
    external_transaction_id?: string;
    message?: string;
};

/**
 * Authenticate with the market's SEP-24 partner (MoneyGram / Zeam) via Stepay-proxied SEP-10.
 * For MoneyGram, the server co-signs with Stepay's SIGNING_KEY (client_domain).
 */
export async function authenticateWithAnchor(secretKey: string): Promise<{
    token: string;
    account: string;
    networkPassphrase: string;
    partnerName: string;
}> {
    const keypair = Keypair.fromSecret(secretKey);
    const account = keypair.publicKey();

    const challengeRes = await fetch(`/api/sep24/auth?account=${encodeURIComponent(account)}`, {
        credentials: 'include',
    });
    const challenge = await challengeRes.json().catch(() => ({}));
    if (!challengeRes.ok || !challenge.transaction) {
        throw new Error(challenge.error || 'Could not start partner authentication');
    }

    const networkPassphrase =
        typeof challenge.network_passphrase === 'string'
            ? challenge.network_passphrase
            : 'Public Global Stellar Network ; September 2015';
    const network = networkPassphrase.includes('Test') ? Networks.TESTNET : Networks.PUBLIC;

    const tx = TransactionBuilder.fromXDR(challenge.transaction, network);
    if (!('sign' in tx) || typeof tx.sign !== 'function') {
        throw new Error('Invalid partner challenge');
    }
    tx.sign(keypair);
    const signed = tx.toXDR();

    const tokenRes = await fetch('/api/sep24/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ transaction: signed }),
    });
    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenData.token) {
        throw new Error(tokenData.error || 'Partner authentication failed');
    }

    return {
        token: String(tokenData.token),
        account: String(tokenData.account || account),
        networkPassphrase:
            typeof tokenData.network_passphrase === 'string'
                ? tokenData.network_passphrase
                : networkPassphrase,
        partnerName: String(challenge.partner_name || tokenData.partner_name || 'partner'),
    };
}

export async function startPartnerCheckout(opts: {
    secretKey: string;
    kind: 'deposit' | 'withdraw';
    amount?: number | string | null;
}): Promise<{
    id: string;
    url: string;
    token: string;
    partnerName: string;
    assetCode: string;
    networkPassphrase: string;
    homeDomain: string;
}> {
    const auth = await authenticateWithAnchor(opts.secretKey);
    const res = await fetch('/api/sep24/interactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            token: auth.token,
            account: auth.account,
            kind: opts.kind,
            amount: opts.amount ?? null,
        }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
        throw new Error(data.error || 'Could not open partner checkout');
    }
    return {
        id: String(data.id),
        url: String(data.url),
        token: auth.token,
        partnerName: String(data.partnerName || auth.partnerName || 'partner'),
        assetCode: String(data.assetCode || 'USDC'),
        networkPassphrase: String(data.networkPassphrase || auth.networkPassphrase),
        homeDomain: String(data.homeDomain || ''),
    };
}

export async function pollPartnerTransaction(opts: {
    id: string;
    token: string;
}): Promise<{
    transaction: Sep24TxStatus;
    partnerName: string;
    assetCode: string;
    networkPassphrase: string;
}> {
    const res = await fetch(
        `/api/sep24/transaction?id=${encodeURIComponent(opts.id)}&token=${encodeURIComponent(opts.token)}`,
        { credentials: 'include' }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.transaction) {
        throw new Error(data.error || 'Could not load transaction status');
    }
    return {
        transaction: data.transaction as Sep24TxStatus,
        partnerName: String(data.partnerName || 'partner'),
        assetCode: String(data.assetCode || 'USDC'),
        networkPassphrase: String(data.networkPassphrase || ''),
    };
}

export async function sendPartnerWithdrawalPayment(opts: {
    secretKey: string;
    transaction: Sep24TxStatus;
    networkPassphrase: string;
}): Promise<string> {
    const dest = opts.transaction.withdraw_anchor_account?.trim();
    const amount = opts.transaction.amount_in?.trim();
    if (!dest?.startsWith('G') || !amount) {
        throw new Error('MoneyGram has not provided send instructions yet. Wait a moment and try again.');
    }
    const memo = opts.transaction.withdraw_memo?.trim();
    const memoType = (opts.transaction.withdraw_memo_type || 'text').toLowerCase() as
        | 'text'
        | 'id'
        | 'hash';

    return clientSendPayment({
        secretKey: opts.secretKey,
        destination: dest,
        amount,
        asset: 'usdc',
        memo,
        memoType: memoType === 'id' || memoType === 'hash' ? memoType : 'text',
        networkPassphrase: opts.networkPassphrase,
    });
}
