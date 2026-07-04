import { randomBytes } from 'crypto';
import { sql } from '@/lib/db';
import { StellarService } from '@/lib/stellar';
import { sendPushNotification } from '@/lib/push';
import { auditSign, assertDailySignLimit, clientIp, getUserWalletSecret, loadUserWalletRow } from '@/lib/signer';
import {
    executePendingPhoneTransfer,
    notifyRegisteredRecipient,
    resolvePhoneRecipient,
} from '@/lib/phone-pay';
import { recordComplianceAlert } from '@/lib/kyc-tiers';
import { validateCheckoutSend, completePaymentReferences } from '@/lib/payment-completion';
import { PLATFORM_WALLET_PUBLIC } from '@/lib/constants';
import { verifyOutgoingPayment } from '@/lib/stellar-tx-verify';
import type { ClientPaymentPlan } from '@/lib/client-stellar';
import { normalizeZambianPhone } from '@/lib/phone';
import { notifyPhoneTransfer } from '@/lib/notifications';

export type SendMode = 'phone' | 'address';

export type SendPayload = {
    mode: SendMode;
    to?: string;
    phone?: string;
    amount: number;
    asset: 'xlm' | 'usdc';
    memo?: string;
    checkoutToken?: string;
    requestToken?: string;
    paySlug?: string;
};

function formatAddress(addr: string): string {
    return addr.trim().toUpperCase();
}

function isValidStellarAddress(addr: string): boolean {
    return /^G[A-Z2-7]{55}$/.test(formatAddress(addr));
}

export async function validateSend(
    userId: string,
    payload: SendPayload
): Promise<{ destAddress: string; amountStr: string; recipientUserId?: string }> {
    const user = await loadUserWalletRow(userId);
    if (!user) throw new Error('User not found');

    const balance =
        payload.asset === 'usdc'
            ? await StellarService.getUSDCBalance(user.wallet_public)
            : await StellarService.getBalance(user.wallet_public);

    if (Number(balance) < payload.amount) {
        throw new Error(`Insufficient ${payload.asset.toUpperCase()} balance. You have ${balance}.`);
    }

    if (payload.asset === 'xlm' && payload.amount < 0.1) {
        throw new Error('Minimum 0.1 XLM to send.');
    }
    if (payload.asset === 'usdc' && payload.amount < 1) {
        throw new Error('Minimum 1 USDC to send.');
    }

    if (payload.checkoutToken && payload.mode !== 'address') {
        throw new Error('Merchant checkout payments must use the merchant wallet address.');
    }

    if (payload.mode === 'phone') {
        const phone = payload.phone?.trim() ?? '';
        if (!phone || phone.replace(/\D/g, '').length < 9) {
            throw new Error('Enter a valid mobile number.');
        }
        const recipient = await resolvePhoneRecipient(phone, userId);
        if (recipient.kind === 'user') {
            return {
                destAddress: recipient.walletPublic,
                amountStr: payload.amount.toFixed(7),
                recipientUserId: recipient.userId,
            };
        }
        return { destAddress: '', amountStr: payload.amount.toFixed(7) };
    }

    const destAddress = formatAddress(payload.to ?? '');
    if (!isValidStellarAddress(destAddress)) {
        throw new Error('Invalid Stellar address. Must start with G and be 56 characters (e.g. GAAAA...).');
    }
    if (destAddress === user.wallet_public) {
        throw new Error('Cannot send to your own address.');
    }

    await validateCheckoutSend(userId, payload, destAddress);

    return { destAddress, amountStr: payload.amount.toFixed(7) };
}

export async function executeSend(
    userId: string,
    payload: SendPayload,
    opts: { intentId: string; request: Request }
): Promise<{ txHash: string; claimUrl?: string; pendingClaim?: boolean; successUrl?: string }> {
    await assertDailySignLimit(userId);
    const validation = await validateSend(userId, payload);
    const ip = clientIp(opts.request);

    const senderRows = await sql`
        SELECT push_token, full_name FROM users WHERE id = ${userId} LIMIT 1
    `;
    const sender = senderRows[0] as { push_token?: string | null; full_name?: string | null } | undefined;

    const secret = await getUserWalletSecret(userId);

    if (payload.mode === 'phone' && !validation.destAddress) {
        const pending = await executePendingPhoneTransfer({
            senderId: userId,
            senderSecret: secret,
            phone: payload.phone!,
            amount: payload.amount,
            asset: payload.asset,
            memo: payload.memo,
        });

        await sql`
            INSERT INTO transactions (user_id, type, amount_fiat, amount_xlm, status, reference, tx_hash, asset)
            VALUES (
                ${userId}, 'SEND', 0, ${payload.amount}, 'COMPLETED',
                ${`PHONE-${pending.claimToken.slice(0, 8)}`}, ${pending.escrowTxHash}, ${payload.asset}
            )
        `;

        await auditSign({ userId, reason: 'send', intentId: opts.intentId, txHash: pending.escrowTxHash, ip });
        await recordComplianceAlert({
            userId,
            alertType: 'phone_pay_pending',
            severity: 'info',
            message: `Pending phone transfer to ${payload.phone}`,
            metadata: { amount: payload.amount, asset: payload.asset },
        });

        return { txHash: pending.escrowTxHash, claimUrl: pending.claimUrl, pendingClaim: true };
    }

    const { destAddress, amountStr, recipientUserId } = validation;
    let txHash: string;
    try {
        txHash =
            payload.asset === 'usdc'
                ? await StellarService.sendUSDC(secret, destAddress, amountStr, payload.memo)
                : await StellarService.sendXLM(secret, destAddress, amountStr, payload.memo);
    } catch (stellarError: unknown) {
        throw stellarError;
    }

    await sql`
        INSERT INTO transactions (user_id, type, amount_fiat, amount_xlm, status, reference, tx_hash, asset)
        VALUES (${userId}, 'SEND', 0, ${payload.amount}, 'COMPLETED', ${`SEND-${Date.now()}`}, ${txHash}, ${payload.asset})
    `;

    if (recipientUserId) {
        await sql`
            INSERT INTO transactions (user_id, type, amount_fiat, amount_xlm, status, reference, tx_hash, asset)
            VALUES (
                ${recipientUserId}, 'RECEIVE', 0, ${payload.amount}, 'COMPLETED',
                ${`RECV-${Date.now()}`}, ${txHash}, ${payload.asset}
            )
        `;
        await notifyRegisteredRecipient({
            recipientUserId,
            senderName: sender?.full_name ?? null,
            amount: payload.amount,
            asset: payload.asset,
        });
    }

    await auditSign({ userId, reason: 'send', intentId: opts.intentId, txHash, ip });

    const completion = await completePaymentReferences(userId, txHash, payload, destAddress);

    if (sender?.push_token) {
        sendPushNotification(
            sender.push_token,
            'Send complete',
            `${payload.amount} ${payload.asset.toUpperCase()} sent successfully.`,
            { type: 'send', amount: payload.amount, asset: payload.asset }
        ).catch(() => {});
    }

    return { txHash, successUrl: completion.successUrl };
}

export type SendClientPlan = ClientPaymentPlan & {
    kind: 'direct' | 'phone_escrow';
    claimToken?: string;
    claimUrl?: string;
};

export async function buildSendClientPlan(userId: string, payload: SendPayload): Promise<SendClientPlan> {
    const validation = await validateSend(userId, payload);
    const amountStr = validation.amountStr;

    if (payload.mode === 'phone' && !validation.destAddress) {
        const claimToken = randomBytes(16).toString('hex');
        const escrowMemo = `CLAIM-${claimToken.slice(0, 12)}`;
        const origin = process.env.AUTH_URL?.replace(/\/$/, '') || 'http://localhost:3000';
        return {
            action: 'payment',
            kind: 'phone_escrow',
            destination: PLATFORM_WALLET_PUBLIC,
            amount: amountStr,
            asset: payload.asset,
            memo: escrowMemo,
            claimToken,
            claimUrl: `${origin}/claim/${claimToken}`,
        };
    }

    return {
        action: 'payment',
        kind: 'direct',
        destination: validation.destAddress,
        amount: amountStr,
        asset: payload.asset,
        memo: payload.memo,
    };
}

export async function finalizeSendClientTx(
    userId: string,
    intentPayload: Record<string, unknown>,
    plan: Record<string, unknown>,
    txHash: string,
    opts: { intentId: string; request: Request }
): Promise<{
    txHash: string;
    claimUrl?: string;
    pendingClaim?: boolean;
    successUrl?: string;
    message: string;
}> {
    await assertDailySignLimit(userId);
    const payload = parseSendPayload(intentPayload);
    const user = await loadUserWalletRow(userId);
    if (!user) throw new Error('User not found');

    const clientPlan = plan as SendClientPlan;
    await verifyOutgoingPayment({
        txHash,
        sourcePublic: user.wallet_public,
        destination: clientPlan.destination,
        amount: clientPlan.amount,
        asset: clientPlan.asset,
        memo: clientPlan.memo,
    });

    const ip = clientIp(opts.request);
    const senderRows = await sql`
        SELECT push_token, full_name FROM users WHERE id = ${userId} LIMIT 1
    `;
    const sender = senderRows[0] as { push_token?: string | null; full_name?: string | null } | undefined;

    if (clientPlan.kind === 'phone_escrow' && clientPlan.claimToken) {
        const phone = payload.phone?.trim() ?? '';
        const claimToken = clientPlan.claimToken;
        const normalized = normalizeZambianPhone(phone);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await sql`
            INSERT INTO pending_phone_transfers (
                sender_id, recipient_phone, recipient_phone_normalized,
                amount, asset, memo, claim_token, escrow_tx_hash, expires_at
            )
            VALUES (
                ${userId},
                ${phone},
                ${normalized},
                ${payload.amount},
                ${payload.asset},
                ${payload.memo ?? null},
                ${claimToken},
                ${txHash},
                ${expiresAt}
            )
        `;

        await sql`
            INSERT INTO transactions (user_id, type, amount_fiat, amount_xlm, status, reference, tx_hash, asset)
            VALUES (
                ${userId}, 'SEND', 0, ${payload.amount}, 'COMPLETED',
                ${`PHONE-${claimToken.slice(0, 8)}`}, ${txHash}, ${payload.asset}
            )
        `;

        await auditSign({ userId, reason: 'send', intentId: opts.intentId, txHash, ip });
        await recordComplianceAlert({
            userId,
            alertType: 'phone_pay_pending',
            severity: 'info',
            message: `Pending phone transfer to ${phone}`,
            metadata: { amount: payload.amount, asset: payload.asset },
        });

        await notifyPhoneTransfer({
            recipientPhone: phone,
            amount: payload.amount,
            asset: payload.asset,
            claimUrl: clientPlan.claimUrl ?? '',
            isRegistered: false,
        });

        return {
            txHash,
            claimUrl: clientPlan.claimUrl,
            pendingClaim: true,
            message: `${payload.amount} ${payload.asset.toUpperCase()} sent — recipient will get a claim link.`,
        };
    }

    const validation = await validateSend(userId, payload);
    const { destAddress, recipientUserId } = validation;

    await sql`
        INSERT INTO transactions (user_id, type, amount_fiat, amount_xlm, status, reference, tx_hash, asset)
        VALUES (${userId}, 'SEND', 0, ${payload.amount}, 'COMPLETED', ${`SEND-${Date.now()}`}, ${txHash}, ${payload.asset})
    `;

    if (recipientUserId) {
        await sql`
            INSERT INTO transactions (user_id, type, amount_fiat, amount_xlm, status, reference, tx_hash, asset)
            VALUES (
                ${recipientUserId}, 'RECEIVE', 0, ${payload.amount}, 'COMPLETED',
                ${`RECV-${Date.now()}`}, ${txHash}, ${payload.asset}
            )
        `;
        await notifyRegisteredRecipient({
            recipientUserId,
            senderName: sender?.full_name ?? null,
            amount: payload.amount,
            asset: payload.asset,
        });
    }

    await auditSign({ userId, reason: 'send', intentId: opts.intentId, txHash, ip });
    const completion = await completePaymentReferences(userId, txHash, payload, destAddress);

    if (sender?.push_token) {
        sendPushNotification(
            sender.push_token,
            'Send complete',
            `${payload.amount} ${payload.asset.toUpperCase()} sent successfully.`,
            { type: 'send', amount: payload.amount, asset: payload.asset }
        ).catch(() => {});
    }

    return {
        txHash,
        successUrl: completion.successUrl,
        message: `${payload.amount} ${payload.asset.toUpperCase()} sent successfully.`,
    };
}

export function parseSendPayload(body: Record<string, unknown>): SendPayload {
    const mode: SendMode = body.mode === 'address' ? 'address' : 'phone';
    const to = typeof body.to === 'string' ? body.to : '';
    const phone = typeof body.phone === 'string' ? body.phone : typeof body.to === 'string' && mode === 'phone' ? body.to : '';
    const amount = Number(body.amount);
    const asset = body.asset === 'xlm' ? 'xlm' : 'usdc';
    const memo = typeof body.memo === 'string' && body.memo.trim() ? body.memo.trim() : undefined;
    if (memo && Buffer.byteLength(memo, 'utf8') > 28) {
        throw new Error('Memo must be 28 bytes or fewer.');
    }
    if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid send details.');
    }
    if (mode === 'phone' && !phone.replace(/\D/g, '')) {
        throw new Error('Enter a recipient phone number.');
    }
    if (mode === 'address' && !to) {
        throw new Error('Enter a Stellar address.');
    }
    const checkoutToken = typeof body.checkoutToken === 'string' ? body.checkoutToken.trim() : undefined;
    const requestToken = typeof body.requestToken === 'string' ? body.requestToken.trim() : undefined;
    const paySlug = typeof body.paySlug === 'string' ? body.paySlug.trim() : undefined;
    return {
        mode,
        to: mode === 'address' ? to : undefined,
        phone: mode === 'phone' ? phone : undefined,
        amount,
        asset,
        memo,
        checkoutToken: checkoutToken || undefined,
        requestToken: requestToken || undefined,
        paySlug: paySlug || undefined,
    };
}

export function friendlySendError(stellarError: unknown): string {
    const err = stellarError as Record<string, unknown>;
    const resp = err?.response as Record<string, unknown> | undefined;
    const body = (resp && 'extras' in resp ? resp : resp?.data) as Record<string, unknown> | undefined;
    const extras = (body?.extras || body) as Record<string, unknown> | undefined;
    const rc = (extras?.result_codes || body?.result_codes) as { transaction?: string; operations?: string[] } | undefined;
    const ops = rc?.operations ?? [];
    const OP_MESSAGES: Record<string, string> = {
        op_no_trust: 'Recipient does not have a USDC trustline. They must add USDC to their wallet first.',
        op_low_reserve: 'Insufficient XLM for network fees. Keep some XLM for reserves.',
        op_underfunded: 'Insufficient balance. Reserve some XLM for network fees.',
        op_no_destination: 'Recipient account does not exist.',
    };
    for (const op of ops) {
        if (OP_MESSAGES[op]) return OP_MESSAGES[op];
    }
    return 'Transaction failed. Check the recipient and your balance, then try again.';
}
