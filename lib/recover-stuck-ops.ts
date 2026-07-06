import { sql } from '@/lib/db';
import { PLATFORM_WALLET_PUBLIC } from '@/lib/constants';
import { coerceIntentPayload } from '@/lib/intent-payload';
import { LencoService } from '@/lib/lenco';
import { parseSellPayload } from '@/lib/operations/sell';
import { parseSwapPayload, type SwapClientPlan } from '@/lib/operations/swap';
import { getPlatformWalletSecret } from '@/lib/platform-signer';
import { StellarService } from '@/lib/stellar';
import { verifyOutgoingPayment } from '@/lib/stellar-tx-verify';
import { auditSign } from '@/lib/signer';

type StuckTxRow = {
    id: string;
    user_id: string;
    type: string;
    status: string;
    reference: string;
    deposit_memo: string | null;
    amount_fiat: number;
    amount_xlm: number;
    asset: string;
    wallet_public: string;
};

async function findInboundHash(memo: string): Promise<string | null> {
    const match = await StellarService.checkMemoTransaction(PLATFORM_WALLET_PUBLIC, memo);
    if (!match || !(match as { successful?: boolean }).successful) return null;
    const hash = (match as { hash?: string }).hash;
    return hash ? String(hash) : null;
}

async function findSellIntentPayload(userId: string, txRecordId: string): Promise<Record<string, unknown> | null> {
    const rows = await sql`
        SELECT payload FROM sign_intents
        WHERE user_id = ${userId} AND type = 'SELL'
          AND payload::text LIKE ${'%' + txRecordId + '%'}
        ORDER BY created_at DESC
        LIMIT 1
    `;
    const row = rows[0] as { payload?: unknown } | undefined;
    if (!row?.payload) return null;
    return coerceIntentPayload(row.payload);
}

async function findSwapIntentPayload(userId: string, reference: string): Promise<Record<string, unknown> | null> {
    const rows = await sql`
        SELECT payload FROM sign_intents
        WHERE user_id = ${userId} AND type = 'SWAP'
          AND payload::text LIKE ${'%' + reference + '%'}
        ORDER BY created_at DESC
        LIMIT 1
    `;
    const row = rows[0] as { payload?: unknown } | undefined;
    if (!row?.payload) return null;
    return coerceIntentPayload(row.payload);
}

export async function tryCompleteStuckSell(tx: StuckTxRow): Promise<'completed' | 'pending' | 'failed'> {
    const memo = tx.deposit_memo ? String(tx.deposit_memo) : '';
    if (!memo) return 'pending';

    const inboundHash = await findInboundHash(memo);
    if (!inboundHash) return 'pending';

    const intentPayload = await findSellIntentPayload(tx.user_id, tx.id);
    if (!intentPayload) return 'pending';

    const plan = intentPayload._clientPlan as Record<string, unknown> | undefined;
    if (!plan) return 'pending';

    const sellPayload = parseSellPayload(intentPayload);
    const fromAsset = sellPayload.asset;
    const amountStr = Number(tx.amount_xlm).toFixed(7);

    try {
        await verifyOutgoingPayment({
            txHash: inboundHash,
            sourcePublic: tx.wallet_public,
            destination: PLATFORM_WALLET_PUBLIC,
            amount: amountStr,
            asset: fromAsset,
            memo,
        });
    } catch {
        return 'pending';
    }

    const amountFiat = Number(tx.amount_fiat);
    const reference = String(tx.reference);
    const payoutEnabled = process.env.LENCO_PAYOUT_ENABLED !== 'false';

    if (payoutEnabled && amountFiat >= 1) {
        try {
            await LencoService.createPayout({
                amount: amountFiat,
                phone: sellPayload.phone,
                operator: sellPayload.operator,
                reference,
            });
        } catch (err) {
            console.error('recover stuck sell payout:', err);
            await sql`
                UPDATE transactions SET status = 'COMPLETED', tx_hash = ${inboundHash}
                WHERE id = ${tx.id} AND status IN ('PENDING', 'PROCESSING')
            `;
            return 'completed';
        }
    }

    await sql`
        UPDATE transactions SET status = 'COMPLETED', tx_hash = ${inboundHash}
        WHERE id = ${tx.id} AND status IN ('PENDING', 'PROCESSING')
    `;
    return 'completed';
}

export async function tryCompleteStuckSwap(tx: StuckTxRow): Promise<'completed' | 'pending' | 'failed'> {
    const reference = String(tx.reference);
    if (!reference.startsWith('SWAP-')) return 'pending';

    const inboundHash = await findInboundHash(reference);
    if (!inboundHash) return 'pending';

    const intentPayload = await findSwapIntentPayload(tx.user_id, reference);
    if (!intentPayload) return 'pending';

    const plan = intentPayload._clientPlan as SwapClientPlan | undefined;
    if (!plan?.swapTxId) return 'pending';

    const swapPayload = parseSwapPayload(intentPayload);
    const fromStr = swapPayload.amount.toFixed(7);

    try {
        await verifyOutgoingPayment({
            txHash: inboundHash,
            sourcePublic: tx.wallet_public,
            destination: PLATFORM_WALLET_PUBLIC,
            amount: fromStr,
            asset: swapPayload.from,
            memo: reference,
        });
    } catch {
        return 'pending';
    }

    const platformSecret = getPlatformWalletSecret();
    const toStr = Number(tx.amount_xlm).toFixed(tx.asset === 'usdc' ? 2 : 7);
    const toAsset = tx.asset === 'usdc' ? 'usdc' : 'xlm';

    let outboundHash: string;
    try {
        if (toAsset === 'usdc') {
            const hasTrust = await StellarService.hasUSDCTrustline(tx.wallet_public);
            if (!hasTrust) {
                await sql`UPDATE transactions SET status = 'FAILED', tx_hash = ${inboundHash} WHERE id = ${tx.id}`;
                return 'failed';
            }
            outboundHash = await StellarService.sendUSDC(platformSecret, tx.wallet_public, toStr, reference);
        } else {
            outboundHash = await StellarService.sendXLM(platformSecret, tx.wallet_public, toStr, reference);
        }
    } catch (err) {
        console.error('recover stuck swap payout:', err);
        await sql`UPDATE transactions SET status = 'FAILED', tx_hash = ${inboundHash} WHERE id = ${tx.id}`;
        return 'failed';
    }

    await sql`
        UPDATE transactions SET status = 'COMPLETED', tx_hash = ${outboundHash}
        WHERE id = ${tx.id} AND status IN ('PENDING', 'PROCESSING')
    `;
    await auditSign({ userId: tx.user_id, reason: 'swap', intentId: null, txHash: outboundHash, ip: null });
    return 'completed';
}

export async function tryCompleteUserStuckOps(userId: string): Promise<Array<{ id: string; type: string; status: string }>> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const rows = await sql`
        SELECT t.id, t.user_id, t.type, t.status, t.reference, t.deposit_memo,
               t.amount_fiat, t.amount_xlm, t.asset, u.wallet_public
        FROM transactions t
        JOIN users u ON u.id = t.user_id
        WHERE t.user_id = ${userId}
          AND t.type IN ('SELL', 'SWAP')
          AND t.status IN ('PENDING', 'PROCESSING')
          AND t.created_at >= ${since}
        ORDER BY t.created_at ASC
        LIMIT 10
    `;

    const results: Array<{ id: string; type: string; status: string }> = [];
    for (const row of rows as unknown as StuckTxRow[]) {
        let status: 'completed' | 'pending' | 'failed' = 'pending';
        if (row.type === 'SELL') {
            status = await tryCompleteStuckSell(row);
        } else if (row.type === 'SWAP') {
            status = await tryCompleteStuckSwap(row);
        }
        results.push({ id: row.id, type: row.type, status });
    }
    return results;
}
