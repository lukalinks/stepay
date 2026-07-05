import { createHmac } from 'crypto';
import { sql } from '@/lib/db';
import { assertSafeWebhookUrl } from '@/lib/url-security';

export type CheckoutPaidEvent = {
    event: 'checkout.paid';
    checkoutId: string;
    checkoutToken: string;
    referenceId: string | null;
    amount: number;
    asset: string;
    txHash: string;
    payerId: string | null;
    paymentMethod: 'wallet' | 'mobile_money';
    paidAt: string;
    metadata: Record<string, unknown>;
};

function signPayload(secret: string, body: string, timestamp: number): string {
    const signed = `${timestamp}.${body}`;
    return createHmac('sha256', secret).update(signed).digest('hex');
}

export async function deliverCheckoutWebhook(
    checkout: Record<string, unknown>,
    payerId: string | null,
    txHash: string,
    paymentMethod: 'wallet' | 'mobile_money' = payerId ? 'wallet' : 'mobile_money'
): Promise<void> {
    const webhookUrl = checkout.webhook_url ? String(checkout.webhook_url) : '';
    if (!webhookUrl) return;

    let safeWebhookUrl: string;
    try {
        safeWebhookUrl = assertSafeWebhookUrl(webhookUrl) ?? '';
    } catch {
        console.error('Merchant webhook blocked (unsafe URL):', webhookUrl);
        return;
    }
    if (!safeWebhookUrl) return;

    let webhookSecret = '';
    const apiKeyId = checkout.api_key_id ? String(checkout.api_key_id) : null;
    if (apiKeyId) {
        const keyRows = await sql`
            SELECT webhook_secret FROM merchant_api_keys WHERE id = ${apiKeyId} LIMIT 1
        `;
        webhookSecret = String((keyRows[0] as { webhook_secret?: string } | undefined)?.webhook_secret ?? '');
    }
    if (!webhookSecret) {
        const merchantRows = await sql`
            SELECT webhook_secret FROM merchant_api_keys
            WHERE user_id = ${String(checkout.merchant_user_id)} AND revoked_at IS NULL
            ORDER BY created_at DESC
            LIMIT 1
        `;
        webhookSecret = String((merchantRows[0] as { webhook_secret?: string } | undefined)?.webhook_secret ?? '');
    }

    const metadata =
        typeof checkout.metadata === 'string'
            ? (JSON.parse(checkout.metadata) as Record<string, unknown>)
            : ((checkout.metadata as Record<string, unknown>) ?? {});

    const payload: CheckoutPaidEvent = {
        event: 'checkout.paid',
        checkoutId: String(checkout.id),
        checkoutToken: String(checkout.checkout_token),
        referenceId: checkout.reference_id ? String(checkout.reference_id) : null,
        amount: Number(checkout.amount),
        asset: String(checkout.asset),
        txHash,
        payerId,
        paymentMethod,
        paidAt: new Date().toISOString(),
        metadata,
    };

    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = webhookSecret ? signPayload(webhookSecret, body, timestamp) : '';

    let responseStatus: number | null = null;
    try {
        const res = await fetch(safeWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Stepay-Webhooks/1.0',
                ...(signature
                    ? {
                          'Stepay-Signature': `t=${timestamp},v1=${signature}`,
                      }
                    : {}),
            },
            body,
            signal: AbortSignal.timeout(15_000),
        });
        responseStatus = res.status;
    } catch (err) {
        console.error('Merchant webhook delivery failed:', err);
        responseStatus = 0;
    }

    await sql`
        INSERT INTO merchant_webhook_deliveries (checkout_id, webhook_url, event_type, payload, response_status)
        VALUES (
            ${String(checkout.id)},
            ${safeWebhookUrl},
            'checkout.paid',
            ${body}::jsonb,
            ${responseStatus}
        )
    `;
}
