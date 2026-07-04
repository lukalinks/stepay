'use client';

import {
    MIN_XLM_FOR_USDC_TRUSTLINE,
    PLATFORM_WALLET_PUBLIC,
    USDC_ISSUER,
} from '@/lib/constants';

export type ClientPaymentPlan = {
    action: 'payment';
    destination: string;
    amount: string;
    asset: 'xlm' | 'usdc';
    memo?: string;
};

export type ClientTxPlan = ClientPaymentPlan;

const HORIZON_URL = 'https://horizon.stellar.org';

async function loadStellar() {
    return import('@stellar/stellar-sdk');
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
        // Wallet not on Stellar yet — first deposit creates the account; trustline comes after.
        return null;
    }

    const hasTrust = account.balances.some(
        (b) => b.asset_type === 'credit_alphanum4' && (b as { asset_code?: string }).asset_code === 'USDC'
    );
    if (hasTrust) return null;

    const native = account.balances.find((b) => b.asset_type === 'native');
    const xlmBalance = native ? Number(native.balance) : 0;
    if (xlmBalance < MIN_XLM_FOR_USDC_TRUSTLINE) {
        // Need ~1.5 XLM on Stellar to cover base + USDC trustline reserves.
        return null;
    }

    const usdcAsset = new StellarSdk.Asset('USDC', USDC_ISSUER);
    const tx = new StellarSdk.TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: StellarSdk.Networks.PUBLIC,
    })
        .addOperation(StellarSdk.Operation.changeTrust({ asset: usdcAsset, limit: '1000000' }))
        .setTimeout(30)
        .build();
    tx.sign(keypair);
    try {
        const result = await server.submitTransaction(tx);
        return result.hash;
    } catch {
        return null;
    }
}

export async function clientSendPayment(opts: {
    secretKey: string;
    destination: string;
    amount: string;
    asset: 'xlm' | 'usdc';
    memo?: string;
}): Promise<string> {
    const StellarSdk = await loadStellar();
    const server = new StellarSdk.Horizon.Server(HORIZON_URL);
    const keypair = StellarSdk.Keypair.fromSecret(opts.secretKey);
    const sourceAccount = await server.loadAccount(keypair.publicKey());
    const amountNum = Number(opts.amount);

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
    } else {
        operation = StellarSdk.Operation.payment({
            destination: opts.destination,
            asset: new StellarSdk.Asset('USDC', USDC_ISSUER),
            amount: opts.amount,
        });
    }

    let builder = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: StellarSdk.Networks.PUBLIC,
    })
        .addOperation(operation)
        .setTimeout(30);

    if (opts.memo) {
        builder = builder.addMemo(StellarSdk.Memo.text(opts.memo));
    }

    const tx = builder.build();
    tx.sign(keypair);
    const result = await server.submitTransaction(tx);
    return result.hash;
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
