'use client';

import {
    MIN_XLM_FOR_USDC_TRUSTLINE,
    PLATFORM_WALLET_PUBLIC,
    USDC_ISSUER,
    USDT0_ISSUER,
} from '@/lib/constants';
import { parseStellarError } from '@/lib/stellar-error';
import { sleep } from '@/lib/client-signing-lock';

export type ClientPaymentPlan = {
    action: 'payment';
    destination: string;
    amount: string;
    asset: 'xlm' | 'usdc' | 'usdt0';
    memo?: string;
};

export type ClientTxPlan = ClientPaymentPlan;

const HORIZON_URL = 'https://horizon.stellar.org';

async function loadStellar() {
    return import('@stellar/stellar-sdk');
}

function isSequenceConflict(err: unknown): boolean {
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
    return msg.includes('sequence conflict') || msg.includes('tx_bad_seq');
}

async function submitWithRetry<T>(submit: () => Promise<T>, attempts = 3): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
        try {
            return await submit();
        } catch (err) {
            lastError = err;
            if (!isSequenceConflict(err) || i >= attempts - 1) break;
            await sleep(1500 * (i + 1));
        }
    }
    throw lastError instanceof Error ? lastError : new Error(parseStellarError(lastError));
}

export async function clientEnsureUSDCTrustline(secretKey: string): Promise<string | null> {
    const StellarSdk = await loadStellar();
    const server = new StellarSdk.Horizon.Server(HORIZON_URL);
    const keypair = StellarSdk.Keypair.fromSecret(secretKey);
    const publicKey = keypair.publicKey();

    let account;
    try {
        account = await server.loadAccount(publicKey);
    } catch {
        return null;
    }

    const hasTrust = account.balances.some(
        (b) =>
            b.asset_type === 'credit_alphanum4' &&
            (b as { asset_code?: string }).asset_code === 'USDC' &&
            (b as { asset_issuer?: string }).asset_issuer === USDC_ISSUER
    );
    if (hasTrust) return null;

    const native = account.balances.find((b) => b.asset_type === 'native');
    const xlmBalance = native ? Number(native.balance) : 0;
    if (xlmBalance < MIN_XLM_FOR_USDC_TRUSTLINE) {
        return null;
    }

    const usdcAsset = new StellarSdk.Asset('USDC', USDC_ISSUER);

    return submitWithRetry(async () => {
        const freshAccount = await server.loadAccount(publicKey);
        const stillNeedsTrust = !freshAccount.balances.some(
            (b) =>
                b.asset_type === 'credit_alphanum4' &&
                (b as { asset_code?: string }).asset_code === 'USDC' &&
                (b as { asset_issuer?: string }).asset_issuer === USDC_ISSUER
        );
        if (!stillNeedsTrust) return null;

        const tx = new StellarSdk.TransactionBuilder(freshAccount, {
            fee: '100',
            networkPassphrase: StellarSdk.Networks.PUBLIC,
        })
            .addOperation(StellarSdk.Operation.changeTrust({ asset: usdcAsset, limit: '1000000' }))
            .setTimeout(30)
            .build();
        tx.sign(keypair);
        const result = await server.submitTransaction(tx);
        return result.hash;
    }).catch(() => null);
}

/** Open a USDT0 trustline so the wallet can receive Tether's Stellar dollar. */
export async function clientEnsureUSDT0Trustline(secretKey: string): Promise<string | null> {
    const StellarSdk = await loadStellar();
    const server = new StellarSdk.Horizon.Server(HORIZON_URL);
    const keypair = StellarSdk.Keypair.fromSecret(secretKey);
    const publicKey = keypair.publicKey();

    let account;
    try {
        account = await server.loadAccount(publicKey);
    } catch {
        return null;
    }

    const hasTrust = account.balances.some(
        (b) =>
            b.asset_type === 'credit_alphanum4' &&
            (b as { asset_code?: string }).asset_code === 'USDT0' &&
            (b as { asset_issuer?: string }).asset_issuer === USDT0_ISSUER
    );
    if (hasTrust) return null;

    const native = account.balances.find((b) => b.asset_type === 'native');
    const xlmBalance = native ? Number(native.balance) : 0;
    if (xlmBalance < MIN_XLM_FOR_USDC_TRUSTLINE) return null;

    const asset = new StellarSdk.Asset('USDT0', USDT0_ISSUER);

    return submitWithRetry(async () => {
        const freshAccount = await server.loadAccount(publicKey);
        const stillNeedsTrust = !freshAccount.balances.some(
            (b) =>
                b.asset_type === 'credit_alphanum4' &&
                (b as { asset_code?: string }).asset_code === 'USDT0' &&
                (b as { asset_issuer?: string }).asset_issuer === USDT0_ISSUER
        );
        if (!stillNeedsTrust) return null;

        const tx = new StellarSdk.TransactionBuilder(freshAccount, {
            fee: '100',
            networkPassphrase: StellarSdk.Networks.PUBLIC,
        })
            .addOperation(StellarSdk.Operation.changeTrust({ asset, limit: '1000000' }))
            .setTimeout(30)
            .build();
        tx.sign(keypair);
        const result = await server.submitTransaction(tx);
        return result.hash;
    }).catch(() => null);
}

export async function clientSendPayment(opts: {
    secretKey: string;
    destination: string;
    amount: string;
    asset: 'xlm' | 'usdc' | 'usdt0';
    memo?: string;
    /** SEP-24 withdraw memos are often `id` (uint64), not text. */
    memoType?: 'text' | 'id' | 'hash';
    networkPassphrase?: string;
    horizonUrl?: string;
    usdcIssuer?: string;
}): Promise<string> {
    const StellarSdk = await loadStellar();
    const isTestnet = (opts.networkPassphrase || '').includes('Test');
    const horizonUrl =
        opts.horizonUrl ||
        (isTestnet ? 'https://horizon-testnet.stellar.org' : HORIZON_URL);
    const networkPassphrase =
        opts.networkPassphrase ||
        (isTestnet ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC);
    const usdcIssuer =
        opts.usdcIssuer ||
        (isTestnet
            ? process.env.NEXT_PUBLIC_SEP_TESTNET_USDC_ISSUER ||
              'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
            : USDC_ISSUER);
    const server = new StellarSdk.Horizon.Server(horizonUrl);
    const keypair = StellarSdk.Keypair.fromSecret(opts.secretKey);
    const amountNum = Number(opts.amount);

    return submitWithRetry(async () => {
        const sourceAccount = await server.loadAccount(keypair.publicKey());

        let operation;
        if (opts.asset === 'xlm') {
            const destExists = await server
                .loadAccount(opts.destination)
                .then(() => true)
                .catch(() => false);
            if (!destExists) {
                if (amountNum < 1) {
                    throw new Error('Minimum 1 XLM required to create a new account.');
                }
                operation = StellarSdk.Operation.createAccount({
                    destination: opts.destination,
                    startingBalance: Math.max(amountNum, 1).toFixed(7),
                });
            } else {
                operation = StellarSdk.Operation.payment({
                    destination: opts.destination,
                    asset: StellarSdk.Asset.native(),
                    amount: opts.amount,
                });
            }
        } else if (opts.asset === 'usdt0') {
            operation = StellarSdk.Operation.payment({
                destination: opts.destination,
                asset: new StellarSdk.Asset('USDT0', USDT0_ISSUER),
                amount: opts.amount,
            });
        } else {
            operation = StellarSdk.Operation.payment({
                destination: opts.destination,
                asset: new StellarSdk.Asset('USDC', usdcIssuer),
                amount: opts.amount,
            });
        }

        let builder = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: String(isTestnet ? 10000 : 100),
            networkPassphrase,
        })
            .addOperation(operation)
            .setTimeout(180);

        if (opts.memo) {
            const memoType = (opts.memoType || 'text').toLowerCase();
            if (memoType === 'id') {
                builder = builder.addMemo(StellarSdk.Memo.id(opts.memo));
            } else if (memoType === 'hash') {
                builder = builder.addMemo(StellarSdk.Memo.hash(opts.memo));
            } else {
                builder = builder.addMemo(StellarSdk.Memo.text(opts.memo));
            }
        }

        const tx = builder.build();
        tx.sign(keypair);
        try {
            const result = await server.submitTransaction(tx);
            return result.hash;
        } catch (err) {
            throw new Error(parseStellarError(err));
        }
    });
}

export async function clientExecutePlan(plan: ClientTxPlan, secretKey: string): Promise<string> {
    if (plan.action === 'payment') {
        return clientSendPayment({
            secretKey,
            destination: plan.destination,
            amount: plan.amount,
            asset: plan.asset,
            memo: plan.memo,
        });
    }
    throw new Error('Unsupported transaction plan.');
}

export { PLATFORM_WALLET_PUBLIC };
