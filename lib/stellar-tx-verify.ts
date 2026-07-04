import * as StellarSdk from '@stellar/stellar-sdk';
import { USDC_ISSUER } from '@/lib/constants';
import { parsePositiveDecimal } from '@/lib/parse-amount';

const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');

type PaymentCheck = {
    txHash: string;
    sourcePublic: string;
    destination: string;
    amount: string;
    asset: 'xlm' | 'usdc';
    memo?: string;
};

function normalizeAmount(amount: string, asset: 'xlm' | 'usdc'): string {
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
