import { markMoneyRequestPaid } from '@/lib/money-requests';
import { assertCheckoutPayable, markCheckoutPaid } from '@/lib/merchant-checkouts';
import { deliverCheckoutWebhook } from '@/lib/merchant-webhooks';
import type { SendPayload } from '@/lib/operations/send';

export async function validateCheckoutSend(
    payerId: string,
    payload: SendPayload,
    destAddress: string
): Promise<void> {
    if (!payload.checkoutToken) return;
    await assertCheckoutPayable(
        payload.checkoutToken,
        payerId,
        payload.amount,
        payload.asset,
        destAddress.toUpperCase()
    );
}

export async function completePaymentReferences(
    payerId: string,
    txHash: string,
    payload: SendPayload,
    destAddress: string
): Promise<{ successUrl?: string }> {
    let successUrl: string | undefined;

    if (payload.requestToken) {
        await markMoneyRequestPaid(payload.requestToken, payerId, txHash);
    }

    if (payload.checkoutToken) {
        const { checkoutId } = await assertCheckoutPayable(
            payload.checkoutToken,
            payerId,
            payload.amount,
            payload.asset,
            destAddress.toUpperCase()
        );

        const paid = await markCheckoutPaid(checkoutId, payerId, txHash);
        if (paid) {
            if (paid.success_url) successUrl = String(paid.success_url);
            deliverCheckoutWebhook(paid, payerId, txHash).catch((err) =>
                console.error('Webhook dispatch error:', err)
            );
        }
    }

    return { successUrl };
}
