import { sql } from '@/lib/db';
import { StellarService } from '@/lib/stellar';
import { LencoService } from '@/lib/lenco';
import { parseStellarError } from '@/lib/stellar-error';
import { PLATFORM_WALLET_PUBLIC } from '@/lib/constants';
import { cryptoToZmw, getFees, getLimits, getRates } from '@/lib/rates';
import { sendPushNotification } from '@/lib/push';
import { auditSign, assertDailySignLimit, clientIp, getUserWalletSecret } from '@/lib/signer';
import { phonesMatch } from '@/lib/phone';
import { parsePositiveDecimalOrThrow } from '@/lib/parse-amount';
import { randomInt } from 'crypto';
import { verifyOutgoingPayment } from '@/lib/stellar-tx-verify';
import type { ClientPaymentPlan } from '@/lib/client-stellar';

export type SellPayload = {
    amount: number;
    asset: 'xlm' | 'usdc';
    phone: string;
    operator: 'mtn' | 'airtel' | 'zamtel';
};

export async function validateSell(userId: string, payload: SellPayload) {
    const userRows = await sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`;
    const user = userRows[0] as Record<string, unknown> | undefined;
    if (!user) throw new Error('User not found');

    const walletPublic = String(user.wallet_public ?? '');
    const assetLabel = payload.asset === 'usdc' ? 'USDC' : 'XLM';

    const balance =
        payload.asset === 'usdc'
            ? await StellarService.getUSDCBalance(walletPublic)
            : await StellarService.getBalance(walletPublic);
    const balanceNum = Number(balance);

    if (balanceNum < payload.amount) {
        throw new Error(`Insufficient ${assetLabel} balance. You have ${balance} ${assetLabel}.`);
    }
    if (payload.asset === 'xlm' && balanceNum - payload.amount < 0.01) {
        throw new Error('Keep at least 0.01 XLM for network fees. Reduce the amount to cash out.');
    }

    const phoneDigits = payload.phone.replace(/\s+/g, '').replace(/^0/, '').replace(/\D/g, '');
    if (phoneDigits.length < 10) {
        throw new Error('Please enter a valid mobile number to receive the cash');
    }

    const profilePhone = String(user.phone_number ?? '').trim();
    if (!profilePhone || profilePhone.replace(/\D/g, '').length < 10) {
        throw new Error('Add your mobile money number in your profile before cashing out.');
    }
    if (!phonesMatch(profilePhone, payload.phone)) {
        throw new Error('Cash out must use the mobile money number on your profile.');
    }

    const [rates, fees, limits] = await Promise.all([getRates(), getFees(), getLimits()]);
    const amountFiat = cryptoToZmw(payload.amount, payload.asset, rates, fees);
    if (amountFiat < limits.min_withdraw_zmw) {
        throw new Error(`Minimum ${limits.min_withdraw_zmw} ZMW payout per withdrawal.`);
    }
    if (amountFiat > limits.max_withdraw_zmw) {
        throw new Error(`Maximum ${limits.max_withdraw_zmw} ZMW per withdrawal.`);
    }

    return { user, amountFiat, phone: payload.phone, assetLabel };
}

export async function executeSell(
    userId: string,
    payload: SellPayload,
    opts: { intentId: string; request: Request }
) {
    await assertDailySignLimit(userId);
    const { user, amountFiat, phone, assetLabel } = await validateSell(userId, payload);
    const ip = clientIp(opts.request);

    const depositMemo = String(randomInt(100000, 1000000));
    const reference = `SELL-${Date.now()}`;

    const insertRows = await sql`
        INSERT INTO transactions (user_id, type, amount_fiat, amount_xlm, status, reference, deposit_memo, asset)
        VALUES (${userId}, 'SELL', ${amountFiat}, ${payload.amount}, 'PENDING', ${reference}, ${depositMemo}, ${payload.asset})
        RETURNING id
    `;
    const txRecord = insertRows[0] as { id: string } | undefined;
    if (!txRecord) {
        throw new Error('Failed to create sell order');
    }

    const secret = await getUserWalletSecret(userId);
    const amountStr = payload.amount.toFixed(7);
    let txHash: string;
    try {
        txHash =
            payload.asset === 'usdc'
                ? await StellarService.sendUSDC(secret, PLATFORM_WALLET_PUBLIC, amountStr, depositMemo)
                : await StellarService.sendXLM(secret, PLATFORM_WALLET_PUBLIC, amountStr, depositMemo);
    } catch (stellarErr: unknown) {
        await sql`UPDATE transactions SET status = 'FAILED' WHERE id = ${txRecord.id}`;
        throw new Error(parseStellarError(stellarErr));
    }

    const operator = payload.operator;
    const payoutEnabled = process.env.LENCO_PAYOUT_ENABLED !== 'false';
    let message: string;

    if (payoutEnabled && amountFiat >= 1) {
        try {
            await LencoService.createPayout({
                amount: amountFiat,
                phone,
                operator,
                reference,
            });
            message = `Sold ${payload.amount} ${assetLabel}! ZMW ${amountFiat.toFixed(2)} is being sent to ${phone}. Funds typically arrive within a few minutes.`;
        } catch (payoutErr: unknown) {
            const errMsg = payoutErr instanceof Error ? payoutErr.message : 'Payout failed';
            await sql`UPDATE transactions SET status = 'COMPLETED', tx_hash = ${txHash} WHERE id = ${txRecord.id}`;
            await auditSign({ userId, reason: 'sell', intentId: opts.intentId, txHash, ip });
            return {
                success: true as const,
                message: `${payload.amount} ${assetLabel} sold. ZMW ${amountFiat.toFixed(2)} payout failed: ${errMsg}. Contact support with ref: ${reference}.`,
                amountFiat,
                txHash,
            };
        }
    } else {
        message = payoutEnabled
            ? `Sold ${payload.amount} ${assetLabel}! ZMW ${amountFiat.toFixed(2)} is being sent to ${phone}.`
            : `Sold ${payload.amount} ${assetLabel}! ZMW ${amountFiat.toFixed(2)} owed. Contact support with ref: ${reference}.`;
    }

    await sql`UPDATE transactions SET status = 'COMPLETED', tx_hash = ${txHash} WHERE id = ${txRecord.id}`;
    await auditSign({ userId, reason: 'sell', intentId: opts.intentId, txHash, ip });

    const pushToken = user.push_token as string | undefined;
    if (pushToken) {
        sendPushNotification(
            pushToken,
            'Cash out complete',
            `Sold ${payload.amount} ${assetLabel}. ZMW ${amountFiat.toFixed(2)} sent to your mobile money.`,
            { type: 'cashout', amountFiat, asset: assetLabel }
        ).catch(() => {});
    }

    return { success: true as const, message, amountFiat, txHash };
}

export type SellClientPlan = ClientPaymentPlan & {
    txRecordId: string;
    reference: string;
    depositMemo: string;
};

export async function buildSellClientPlan(userId: string, payload: SellPayload): Promise<SellClientPlan> {
    const { amountFiat } = await validateSell(userId, payload);
    const depositMemo = String(randomInt(100000, 1000000));
    const reference = `SELL-${Date.now()}`;

    const insertRows = await sql`
        INSERT INTO transactions (user_id, type, amount_fiat, amount_xlm, status, reference, deposit_memo, asset)
        VALUES (${userId}, 'SELL', ${amountFiat}, ${payload.amount}, 'PENDING', ${reference}, ${depositMemo}, ${payload.asset})
        RETURNING id
    `;
    const txRecord = insertRows[0] as { id: string } | undefined;
    if (!txRecord) throw new Error('Failed to create sell order');

    return {
        action: 'payment',
        destination: PLATFORM_WALLET_PUBLIC,
        amount: payload.amount.toFixed(7),
        asset: payload.asset,
        memo: depositMemo,
        txRecordId: txRecord.id,
        reference,
        depositMemo,
    };
}

export async function finalizeSellClientTx(
    userId: string,
    intentPayload: Record<string, unknown>,
    plan: Record<string, unknown>,
    txHash: string,
    opts: { intentId: string; request: Request }
): Promise<{ success: true; message: string; amountFiat: number; txHash: string }> {
    await assertDailySignLimit(userId);
    const payload = parseSellPayload(intentPayload);
    const clientPlan = plan as SellClientPlan;
    const userRows = await sql`SELECT wallet_public, push_token FROM users WHERE id = ${userId} LIMIT 1`;
    const user = userRows[0] as { wallet_public: string; push_token?: string | null } | undefined;
    if (!user) throw new Error('User not found');

    await verifyOutgoingPayment({
        txHash,
        sourcePublic: user.wallet_public,
        destination: clientPlan.destination,
        amount: clientPlan.amount,
        asset: clientPlan.asset,
        memo: clientPlan.depositMemo,
    });

    const { amountFiat, phone, assetLabel } = await validateSell(userId, payload);
    const ip = clientIp(opts.request);
    const reference = clientPlan.reference;

    const payoutEnabled = process.env.LENCO_PAYOUT_ENABLED !== 'false';
    let message: string;

    if (payoutEnabled && amountFiat >= 1) {
        try {
            await LencoService.createPayout({
                amount: amountFiat,
                phone,
                operator: payload.operator,
                reference,
            });
            message = `Sold ${payload.amount} ${assetLabel}! ZMW ${amountFiat.toFixed(2)} is being sent to ${phone}. Funds typically arrive within a few minutes.`;
        } catch (payoutErr: unknown) {
            const errMsg = payoutErr instanceof Error ? payoutErr.message : 'Payout failed';
            await sql`UPDATE transactions SET status = 'COMPLETED', tx_hash = ${txHash} WHERE id = ${clientPlan.txRecordId}`;
            await auditSign({ userId, reason: 'sell', intentId: opts.intentId, txHash, ip });
            return {
                success: true,
                message: `${payload.amount} ${assetLabel} sold. ZMW ${amountFiat.toFixed(2)} payout failed: ${errMsg}. Contact support with ref: ${reference}.`,
                amountFiat,
                txHash,
            };
        }
    } else {
        message = payoutEnabled
            ? `Sold ${payload.amount} ${assetLabel}! ZMW ${amountFiat.toFixed(2)} is being sent to ${phone}.`
            : `Sold ${payload.amount} ${assetLabel}! ZMW ${amountFiat.toFixed(2)} owed. Contact support with ref: ${reference}.`;
    }

    await sql`UPDATE transactions SET status = 'COMPLETED', tx_hash = ${txHash} WHERE id = ${clientPlan.txRecordId}`;
    await auditSign({ userId, reason: 'sell', intentId: opts.intentId, txHash, ip });

    if (user.push_token) {
        sendPushNotification(
            user.push_token,
            'Cash out complete',
            `Sold ${payload.amount} ${assetLabel}. ZMW ${amountFiat.toFixed(2)} sent to your mobile money.`,
            { type: 'cashout', amountFiat, asset: assetLabel }
        ).catch(() => {});
    }

    return { success: true, message, amountFiat, txHash };
}

export function parseSellPayload(body: Record<string, unknown>): SellPayload {
    const amount = parsePositiveDecimalOrThrow(body.amount, 'Enter a valid amount to cash out.');
    const asset = body.asset === 'usdc' ? 'usdc' : 'xlm';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const operator = ['mtn', 'airtel', 'zamtel'].includes(String(body.operator))
        ? (String(body.operator) as 'mtn' | 'airtel' | 'zamtel')
        : 'mtn';
    return { amount, asset, phone, operator };
}
