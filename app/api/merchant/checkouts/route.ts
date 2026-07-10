import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { createMerchantCheckout, listCheckoutsForMerchant } from '@/lib/merchant-checkouts';

export async function GET(request: Request) {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const checkouts = await listCheckoutsForMerchant(userId);
    return NextResponse.json({ checkouts });
}

export async function POST(request: Request) {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const checkout = await createMerchantCheckout({
            merchantUserId: userId,
            amount: Number(body.amount),
            asset: body.asset === 'xlm' ? 'xlm' : 'usdc',
            label: typeof body.label === 'string' ? body.label : '',
            description: typeof body.description === 'string' ? body.description : undefined,
            referenceId: typeof body.referenceId === 'string' ? body.referenceId : undefined,
            successUrl: typeof body.successUrl === 'string' ? body.successUrl : undefined,
            cancelUrl: typeof body.cancelUrl === 'string' ? body.cancelUrl : undefined,
            webhookUrl: typeof body.webhookUrl === 'string' ? body.webhookUrl : undefined,
        });
        return NextResponse.json(checkout);
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create checkout';
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}
