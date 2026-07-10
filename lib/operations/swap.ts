import { sql } from '@/lib/db';
import { StellarService } from '@/lib/stellar';
import { PLATFORM_WALLET_PUBLIC } from '@/lib/constants';
import { getFees, getRates, swapQuote } from '@/lib/rates';
import { sendPushNotification } from '@/lib/push';
import { auditSign, assertDailySignLimit, clientIp, getUserWalletSecret, loadUserWalletRow } from '@/lib/signer';
import { getPlatformWalletSecret } from '@/lib/platform-signer';
import { randomBytes } from 'crypto';
import { verifyOutgoingPayment } from '@/lib/stellar-tx-verify';
import { parsePositiveDecimalOrThrow } from '@/lib/parse-amount';
import { coerceIntentPayload } from '@/lib/intent-payload';
import type { ClientPaymentPlan } from '@/lib/client-stellar';

export type SwapPayload = {
    from: 'xlm' | 'usdc';
    to: 'xlm' | 'usdc';
    amount: number;
};

const MIN_XLM = 0.1;
const MIN_USDC = 1;
const XLM_SWAP_RESERVE = 1.5;

export async function validateSwap(userId: string, payload: SwapPayload) {
    if (payload.from === payload.to) {
        throw new Error('Choose two different assets to swap.');
    }
    if (payload.from === 'xlm' && payload.amount < MIN_XLM) {
        throw new Error(`Minimum ${MIN_XLM} XLM to swap.`);
    }
    if (payload.from === 'usdc' && payload.amount < MIN_USDC) {
        throw new Error(`Minimum ${MIN_USDC} USDC to swap.`);
    }

    const user = await loadUserWalletRow(userId);
    if (!user) throw new Error('User not found');

    const [xlmBalance, usdcBalance, rates, fees] = await Promise.all([
        StellarService.getBalance(user.wallet_public),
        StellarService.getUSDCBalance(user.wallet_public),
        getRates(),
        getFees(),
    ]);

    const fromBalance = payload.from === 'xlm' ? Number(xlmBalance) : Number(usdcBalance);
    if (payload.from === 'xlm' && fromBalance < payload.amount + XLM_SWAP_RESERVE) {
        throw new Error(`Insufficient XLM. Keep at least ${XLM_SWAP_RESERVE} XLM for network reserves and fees.`);
    }
    if (fromBalance < payload.amount) {
        throw new Error(`Insufficient ${payload.from.toUpperCase()} balance. You have ${fromBalance}.`);
    }

    const { toAmount } = swapQuote(payload.amount, payload.from, payload.to, rates, fees);
    if (toAmount <= 0) {
        throw new Error('Swap amount is too small.');
    }

    return { user, toAmount, rates, fees };
}

export async function executeSwap(userId: string, payload: SwapPayload, opts: { intentId: string; request: Request }) {
    await assertDailySignLimit(userId);
    const platformSecret = getPlatformWalletSecret();

    const { user, toAmount } = await validateSwap(userId, payload);
    const ip = clientIp(opts.request);
    const { from, to, amount } = payload;

    const fromStr = amount.toFixed(7);
    const toStr = toAmount.toFixed(to === 'usdc' ? 2 : 7);
    const reference = `SWAP-${randomBytes(8).toString('hex')}`;

    const insertRows = await sql`
        INSERT INTO transactions (user_id, type, amount_fiat, amount_xlm, status, reference, asset)
        VALUES (${userId}, 'SWAP', ${amount}, ${Number(toStr)}, 'PROCESSING', ${reference}, ${to})
        RETURNING id
    `;
    const swapTxId = (insertRows[0] as { id: string }).id;

    const secret = await getUserWalletSecret(userId);
    let inboundHash: string;
    try {
        inboundHash =
            from === 'usdc'
                ? await StellarService.sendUSDC(secret, PLATFORM_WALLET_PUBLIC, fromStr, reference)
                : await StellarService.sendXLM(secret, PLATFORM_WALLET_PUBLIC, fromStr, reference);
    } catch {
        await sql`UPDATE transactions SET status = 'FAILED' WHERE id = ${swapTxId}`;
        throw new Error('Could not send your crypto for the swap. Check your balance and try again.');
    }

    let outboundHash: string;
    try {
        if (to === 'usdc') {
            await StellarService.ensureUSDCTrustline(secret);
            outboundHash = await StellarService.sendUSDC(platformSecret, user.wallet_public, toStr, reference);
        } else {
            outboundHash = await StellarService.sendXLM(platformSecret, user.wallet_public, toStr, reference);
        }
    } catch {
        await sql`
            UPDATE transactions SET status = 'FAILED', tx_hash = ${inboundHash}
            WHERE id = ${swapTxId}
        `;
        console.error(`Swap payout failed after inbound ${inboundHash} ref ${reference}`);
        throw new Error(
            'Swap received your crypto but payout failed. Contact support with reference ' + reference
        );
    }

    await sql`
        UPDATE transactions SET status = 'COMPLETED', tx_hash = ${outboundHash}
        WHERE id = ${swapTxId}
    `;

    await auditSign({ userId, reason: 'swap', intentId: opts.intentId, txHash: outboundHash, ip });

    const userRows = await sql`SELECT push_token FROM users WHERE id = ${userId} LIMIT 1`;
    const pushToken = (userRows[0] as { push_token?: string | null } | undefined)?.push_token;
    if (pushToken) {
        sendPushNotification(
            pushToken,
            'Swap complete',
            `${fromStr} ${from.toUpperCase()} → ${toStr} ${to.toUpperCase()}`,
            { type: 'swap', from, to, fromAmount: amount, toAmount: Number(toStr) }
        ).catch(() => {});
    }

    return {
        success: true as const,
        txHash: outboundHash,
        from,
        to,
        fromAmount: amount,
        toAmount: Number(toStr),
        message: `Swapped ${amount} ${from.toUpperCase()} for ${toStr} ${to.toUpperCase()}.`,
        inboundHash,
    };
}

export type SwapClientPlan = ClientPaymentPlan & {
    swapTxId: string;
    reference: string;
    toAsset: 'xlm' | 'usdc';
    toAmount: number;
};

export async function buildSwapClientPlan(userId: string, payload: SwapPayload): Promise<SwapClientPlan> {
    const { user, toAmount } = await validateSwap(userId, payload);
    const reference = `SWAP-${randomBytes(8).toString('hex')}`;
    const fromStr = payload.amount.toFixed(7);
    const toStr = toAmount.toFixed(payload.to === 'usdc' ? 2 : 7);

    const insertRows = await sql`
        INSERT INTO transactions (user_id, type, amount_fiat, amount_xlm, status, reference, asset)
        VALUES (${userId}, 'SWAP', ${payload.amount}, ${Number(toStr)}, 'PROCESSING', ${reference}, ${payload.to})
        RETURNING id
    `;
    const swapTxId = (insertRows[0] as { id: string }).id;

    return {
        action: 'payment',
        destination: PLATFORM_WALLET_PUBLIC,
        amount: fromStr,
        asset: payload.from,
        memo: reference,
        swapTxId,
        reference,
        toAsset: payload.to,
        toAmount: Number(toStr),
    };
}

export async function finalizeSwapClientTx(
    userId: string,
    intentPayload: Record<string, unknown>,
    plan: Record<string, unknown>,
    inboundTxHash: string,
    opts: { intentId: string; request: Request }
): Promise<{
    success: true;
    txHash: string;
    from: string;
    to: string;
    fromAmount: number;
    toAmount: number;
    message: string;
    inboundHash: string;
}> {
    await assertDailySignLimit(userId);
    const payload = parseSwapPayload(intentPayload);
    const clientPlan = plan as SwapClientPlan;
    const platformSecret = getPlatformWalletSecret();
    const user = await loadUserWalletRow(userId);
    if (!user) throw new Error('User not found');
    const ip = clientIp(opts.request);

    await verifyOutgoingPayment({
        txHash: inboundTxHash,
        sourcePublic: user.wallet_public,
        destination: clientPlan.destination,
        amount: clientPlan.amount,
        asset: payload.from,
        memo: clientPlan.reference,
    });

    const toStr = clientPlan.toAmount.toFixed(clientPlan.toAsset === 'usdc' ? 2 : 7);
    let outboundHash: string;
    try {
        if (clientPlan.toAsset === 'usdc') {
            const hasTrust = await StellarService.hasUSDCTrustline(user.wallet_public);
            if (!hasTrust) {
                await sql`UPDATE transactions SET status = 'FAILED', tx_hash = ${inboundTxHash} WHERE id = ${clientPlan.swapTxId}`;
                throw new Error('Enable USDC on your wallet before swapping to USDC.');
            }
            outboundHash = await StellarService.sendUSDC(platformSecret, user.wallet_public, toStr, clientPlan.reference);
        } else {
            outboundHash = await StellarService.sendXLM(platformSecret, user.wallet_public, toStr, clientPlan.reference);
        }
    } catch {
        await sql`
            UPDATE transactions SET status = 'FAILED', tx_hash = ${inboundTxHash}
            WHERE id = ${clientPlan.swapTxId}
        `;
        throw new Error(
            'Swap received your crypto but payout failed. Contact support with reference ' + clientPlan.reference
        );
    }

    await sql`
        UPDATE transactions SET status = 'COMPLETED', tx_hash = ${outboundHash}
        WHERE id = ${clientPlan.swapTxId}
    `;
    await auditSign({ userId, reason: 'swap', intentId: opts.intentId, txHash: outboundHash, ip });

    const userRows = await sql`SELECT push_token FROM users WHERE id = ${userId} LIMIT 1`;
    const pushToken = (userRows[0] as { push_token?: string | null } | undefined)?.push_token;
    if (pushToken) {
        sendPushNotification(
            pushToken,
            'Swap complete',
            `${clientPlan.amount} ${payload.from.toUpperCase()} → ${toStr} ${clientPlan.toAsset.toUpperCase()}`,
            { type: 'swap', from: payload.from, to: clientPlan.toAsset, fromAmount: payload.amount, toAmount: clientPlan.toAmount }
        ).catch(() => {});
    }

    return {
        success: true,
        txHash: outboundHash,
        from: payload.from,
        to: clientPlan.toAsset,
        fromAmount: payload.amount,
        toAmount: clientPlan.toAmount,
        message: `Swapped ${payload.amount} ${payload.from.toUpperCase()} for ${toStr} ${clientPlan.toAsset.toUpperCase()}.`,
        inboundHash: inboundTxHash,
    };
}

export function parseSwapPayload(body: Record<string, unknown>): SwapPayload {
    const raw = coerceIntentPayload(body);
    const from = raw.from === 'usdc' ? 'usdc' : 'xlm';
    const to = raw.to === 'usdc' ? 'usdc' : 'xlm';
    const amount = parsePositiveDecimalOrThrow(raw.amount, 'Enter a valid amount to swap.');
    return { from, to, amount };
}
