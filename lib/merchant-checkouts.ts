import { randomBytes } from 'crypto';
import { sql } from '@/lib/db';
import { getMarket, marketSupportsPayment } from '@/lib/markets';
import { quoteCheckoutMobileMoney } from '@/lib/checkout-mobile-money';
import { assertSafeRedirectUrl, assertSafeWebhookUrl, sanitizeRedirectUrlForClient } from '@/lib/url-security';

export type CheckoutStatus = 'pending' | 'paid' | 'expired' | 'cancelled';

export type CreateCheckoutInput = {
    merchantUserId: string;
    apiKeyId?: string;
    amount: number;
    asset?: 'xlm' | 'usdc';
    label: string;
    description?: string;
    referenceId?: string;
    metadata?: Record<string, unknown>;
    successUrl?: string;
    cancelUrl?: string;
    webhookUrl?: string;
    expiresInMinutes?: number;
};

function appOrigin(): string {
    return process.env.AUTH_URL?.replace(/\/$/, '') || 'http://localhost:3000';
}

export function checkoutUrls(token: string) {
    const origin = appOrigin();
    return {
        checkoutUrl: `${origin}/pay/checkout/${token}`,
        embedUrl: `${origin}/pay/checkout/${token}?embed=1`,
    };
}

export async function createMerchantCheckout(input: CreateCheckoutInput) {
    const asset = input.asset === 'xlm' ? 'xlm' : 'usdc';
    const amount = Number(input.amount);
    if (isNaN(amount) || amount <= 0) throw new Error('Amount must be greater than zero.');
    if (asset === 'usdc' && amount < 1) throw new Error('Minimum checkout amount is 1 USDC.');
    if (asset === 'xlm' && amount < 0.1) throw new Error('Minimum checkout amount is 0.1 XLM.');

    const label = input.label.trim();
    if (!label) throw new Error('Label is required (e.g. "School fees", "Invoice #123").');

    const ttlMin = Math.min(Math.max(input.expiresInMinutes ?? 60 * 24, 15), 60 * 24 * 7);
    const checkoutToken = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000).toISOString();
    const metadata = JSON.stringify(input.metadata ?? {});
    const successUrl = assertSafeRedirectUrl(input.successUrl);
    const cancelUrl = assertSafeRedirectUrl(input.cancelUrl);
    const webhookUrl = assertSafeWebhookUrl(input.webhookUrl);

    const rows = await sql`
        INSERT INTO merchant_checkouts (
            merchant_user_id, api_key_id, checkout_token, amount, asset, label, description,
            reference_id, metadata, success_url, cancel_url, webhook_url, expires_at
        )
        VALUES (
            ${input.merchantUserId},
            ${input.apiKeyId ?? null},
            ${checkoutToken},
            ${amount},
            ${asset},
            ${label},
            ${input.description?.trim() || null},
            ${input.referenceId?.trim() || null},
            ${metadata}::jsonb,
            ${successUrl},
            ${cancelUrl},
            ${webhookUrl},
            ${expiresAt}
        )
        RETURNING id, checkout_token, amount, asset, label, status, expires_at, created_at
    `;

    const row = rows[0] as Record<string, unknown>;
    const urls = checkoutUrls(String(row.checkout_token));

    return {
        id: row.id,
        checkoutToken: row.checkout_token,
        amount: Number(row.amount),
        asset: row.asset,
        label: row.label,
        status: row.status,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        ...urls,
    };
}

export async function getCheckoutByToken(token: string) {
    const rows = await sql`
        SELECT c.*, u.full_name AS merchant_name, u.wallet_public AS merchant_wallet, u.country_code AS merchant_country
        FROM merchant_checkouts c
        JOIN users u ON u.id = c.merchant_user_id
        WHERE c.checkout_token = ${token}
        LIMIT 1
    `;
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;

    if (row.status === 'pending' && new Date(String(row.expires_at)) < new Date()) {
        await sql`UPDATE merchant_checkouts SET status = 'expired' WHERE id = ${String(row.id)} AND status = 'pending'`;
        row.status = 'expired';
    }

    return row;
}

export async function getCheckoutByIdForMerchant(merchantUserId: string, checkoutId: string) {
    const rows = await sql`
        SELECT * FROM merchant_checkouts
        WHERE id = ${checkoutId} AND merchant_user_id = ${merchantUserId}
        LIMIT 1
    `;
    return (rows[0] as Record<string, unknown> | undefined) ?? null;
}

export async function listCheckoutsForMerchant(merchantUserId: string, limit = 30) {
    const rows = await sql`
        SELECT id, checkout_token, amount, asset, label, reference_id, status, expires_at, paid_at, created_at
        FROM merchant_checkouts
        WHERE merchant_user_id = ${merchantUserId}
        ORDER BY created_at DESC
        LIMIT ${limit}
    `;
    return rows.map((row) => {
        const r = row as Record<string, unknown>;
        const token = String(r.checkout_token);
        return {
            id: r.id,
            amount: Number(r.amount),
            asset: r.asset,
            label: r.label,
            referenceId: r.reference_id,
            status: r.status,
            expiresAt: r.expires_at,
            paidAt: r.paid_at,
            createdAt: r.created_at,
            ...checkoutUrls(token),
        };
    });
}

export async function assertCheckoutPayable(
    checkoutToken: string,
    payerId: string,
    amount: number,
    asset: 'xlm' | 'usdc',
    destAddress: string
): Promise<{ checkoutId: string; merchantUserId: string; webhookUrl: string | null; apiKeyId: string | null }> {
    const checkout = await getCheckoutByToken(checkoutToken);
    if (!checkout) throw new Error('Checkout session not found or expired.');
    if (checkout.status !== 'pending') throw new Error('This payment link is no longer active.');
    if (String(checkout.merchant_user_id) === payerId) {
        throw new Error('You cannot pay your own checkout.');
    }

    const expectedAmount = Number(checkout.amount);
    const expectedAsset = checkout.asset === 'xlm' ? 'xlm' : 'usdc';
    if (expectedAsset !== asset || Math.abs(expectedAmount - amount) > 0.0000001) {
        throw new Error('Payment amount does not match the checkout.');
    }

    const merchantWallet = String(checkout.merchant_wallet).toUpperCase();
    if (destAddress.toUpperCase() !== merchantWallet) {
        throw new Error('Payment must go to the merchant on this checkout.');
    }

    return {
        checkoutId: String(checkout.id),
        merchantUserId: String(checkout.merchant_user_id),
        webhookUrl: checkout.webhook_url ? String(checkout.webhook_url) : null,
        apiKeyId: checkout.api_key_id ? String(checkout.api_key_id) : null,
    };
}

export async function markCheckoutPaid(
    checkoutId: string,
    payerId: string | null,
    txHash: string
): Promise<Record<string, unknown> | null> {
    const rows = await sql`
        UPDATE merchant_checkouts
        SET status = 'paid', payer_id = ${payerId}, tx_hash = ${txHash}, paid_at = NOW()
        WHERE id = ${checkoutId} AND status = 'pending'
        RETURNING *
    `;
    return (rows[0] as Record<string, unknown> | undefined) ?? null;
}

export function serializeCheckoutPublic(checkout: Record<string, unknown>) {
    const token = String(checkout.checkout_token);
    const urls = checkoutUrls(token);
    const asset = checkout.asset === 'xlm' ? 'xlm' : 'usdc';
    const amount = Number(checkout.amount);
    const countryCode = String(checkout.merchant_country ?? 'ZM');
    const market = getMarket(countryCode);

    return {
        label: checkout.label,
        description: checkout.description,
        amount,
        asset,
        merchantName: checkout.merchant_name,
        status: checkout.status,
        referenceId: checkout.reference_id,
        cancelUrl: sanitizeRedirectUrlForClient(checkout.cancel_url ? String(checkout.cancel_url) : null),
        successUrl: sanitizeRedirectUrlForClient(checkout.success_url ? String(checkout.success_url) : null),
        expiresAt: checkout.expires_at,
        paidAt: checkout.paid_at,
        countryCode: market.countryCode,
        currency: market.currency,
        phoneDialCode: market.phoneDialCode,
        mobileOperators: market.mobileOperators,
        mobileMoneyEnabled: asset === 'usdc' && marketSupportsPayment(market.countryCode, 'mobile_money'),
        ...urls,
    };
}

export async function serializeCheckoutPublicWithQuote(checkout: Record<string, unknown>) {
    const base = serializeCheckoutPublic(checkout);
    if (!base.mobileMoneyEnabled || base.status !== 'pending') {
        return { ...base, mobileMoneyZmw: null as number | null };
    }
    const quote = await quoteCheckoutMobileMoney(base.amount, base.countryCode);
    return {
        ...base,
        mobileMoneyZmw: quote?.zmwAmount ?? null,
    };
}

export function serializeCheckoutMerchant(checkout: Record<string, unknown>) {
    const token = String(checkout.checkout_token);
    return {
        id: checkout.id,
        checkoutToken: token,
        amount: Number(checkout.amount),
        asset: checkout.asset,
        label: checkout.label,
        description: checkout.description,
        referenceId: checkout.reference_id,
        metadata: checkout.metadata,
        status: checkout.status,
        payerId: checkout.payer_id,
        txHash: checkout.tx_hash,
        successUrl: checkout.success_url,
        cancelUrl: checkout.cancel_url,
        webhookUrl: checkout.webhook_url,
        expiresAt: checkout.expires_at,
        paidAt: checkout.paid_at,
        createdAt: checkout.created_at,
        ...checkoutUrls(token),
    };
}
