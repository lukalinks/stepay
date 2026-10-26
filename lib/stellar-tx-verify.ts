import * as StellarSdk from '@stellar/stellar-sdk';
import { USDC_ISSUER, USDT0_ISSUER } from '@/lib/constants';
import { parsePositiveDecimal } from '@/lib/parse-amount';

const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

type PaymentCheck = {
    txHash: string;
    sourcePublic: string;
    destination: string;
    amount: string;
    asset: 'xlm' | 'usdc' | 'usdt0';
    memo?: string;
};

function normalizeAmount(amount: string, asset: 'xlm' | 'usdc' | 'usdt0'): string {
    const n = parsePositiveDecimal(amount);
    if (n == null) throw new Error('Invalid amount.');
    return n.toFixed(asset === 'usdc' ? 7 : 7);
}

function decodeMemo(memo: string | undefined): string {
    if (!memo) return '';
    try {
        if (/^[A-Za-z0-9+/=]+$/.test(memo) && memo.length % 4 === 0) {
            return Buffer.from(memo, 'base64').toString('utf8');
        }
    } catch {
        // ignore
    }
    return memo;
}

export async function verifyOutgoingPayment(check: PaymentCheck): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            await verifyOutgoingPaymentOnce(check);
            return;
        } catch (err) {
            lastError = err instanceof Error ? err : new Error('Could not verify transaction.');
            const msg = lastError.message.toLowerCase();
            const retryable =
                msg.includes('not found') ||
                msg.includes('404') ||
                msg.includes('failed to fetch') ||
                msg.includes('network');
            if (!retryable || attempt >= 4) break;
            await sleep(2000 * (attempt + 1));
        }
    }

    throw lastError ?? new Error('Could not verify transaction on the Stellar network.');
}

async function verifyOutgoingPaymentOnce(check: PaymentCheck): Promise<void> {
    const tx = await server.transactions().transaction(check.txHash).call();
    if (tx.source_account !== check.sourcePublic) {
        throw new Error('Transaction was not signed by your wallet.');
    }
    if (!tx.successful) {
        throw new Error('Transaction failed on the Stellar network.');
    }

    if (check.memo) {
        const onChain = decodeMemo(tx.memo ?? '');
        if (tx.memo_type !== 'text' || onChain !== check.memo) {
            throw new Error('Transaction memo does not match.');
        }
    }

    const expectedAmount = normalizeAmount(check.amount, check.asset);
    const ops = await server.operations().forTransaction(check.txHash).call();
    const matched = ops.records.some((op) => {
        if (op.type !== 'payment') return false;
        const payment = op as StellarSdk.Horizon.ServerApi.PaymentOperationRecord;
        if (payment.from !== check.sourcePublic || payment.to !== check.destination) return false;
        if (check.asset === 'xlm') {
            return payment.asset_type === 'native' && normalizeAmount(payment.amount, 'xlm') === expectedAmount;
        }
        if (check.asset === 'usdt0') {
            return (
                payment.asset_type === 'credit_alphanum4' &&
                payment.asset_code === 'USDT0' &&
                payment.asset_issuer === USDT0_ISSUER &&
                normalizeAmount(payment.amount, 'usdt0') === expectedAmount
            );
        }
        return (
            payment.asset_type === 'credit_alphanum4' &&
            payment.asset_code === 'USDC' &&
            payment.asset_issuer === USDC_ISSUER &&
            normalizeAmount(payment.amount, 'usdc') === expectedAmount
        );
    });

    if (!matched) {
        throw new Error('Transaction payment details do not match.');
    }
}
