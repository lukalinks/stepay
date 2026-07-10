import { NextResponse } from 'next/server';
import { authenticateMerchantApiKey } from '@/lib/merchant-auth';
import {
    createMerchantCheckout,
    listCheckoutsForMerchant,
    serializeCheckoutMerchant,
} from '@/lib/merchant-checkouts';

export async function POST(request: Request) {
    const key = await authenticateMerchantApiKey(request);
    if (!key) {
        return NextResponse.json({ error: 'Invalid or missing API key. Use Authorization: Bearer sk_live_...' }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const checkout = await createMerchantCheckout({
            merchantUserId: key.user_id,
            apiKeyId: key.id,
            amount: Number(body.amount),
            asset: body.asset === 'xlm' ? 'xlm' : 'usdc',
            label: typeof body.label === 'string' ? body.label : '',
            description: typeof body.description === 'string' ? body.description : undefined,
            referenceId: typeof body.reference === 'string' ? body.reference : typeof body.referenceId === 'string' ? body.referenceId : undefined,
            metadata: typeof body.metadata === 'object' && body.metadata ? (body.metadata as Record<string, unknown>) : undefined,
            successUrl: typeof body.success_url === 'string' ? body.success_url : undefined,
            cancelUrl: typeof body.cancel_url === 'string' ? body.cancel_url : undefined,
            webhookUrl: typeof body.webhook_url === 'string' ? body.webhook_url : undefined,
            expiresInMinutes: typeof body.expires_in_minutes === 'number' ? body.expires_in_minutes : undefined,
        });

        return NextResponse.json({
            id: checkout.id,
            checkout_token: checkout.checkoutToken,
            amount: checkout.amount,
            asset: checkout.asset,
            label: checkout.label,
            status: checkout.status,
            expires_at: checkout.expiresAt,
            checkout_url: checkout.checkoutUrl,
            embed_url: checkout.embedUrl,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create checkout';
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}

export async function GET(request: Request) {
    const key = await authenticateMerchantApiKey(request);
    if (!key) {
        return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    const checkouts = await listCheckoutsForMerchant(key.user_id);
    return NextResponse.json({ checkouts });
}
