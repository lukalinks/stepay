import { NextResponse } from 'next/server';
import { authenticateMerchantApiKey } from '@/lib/merchant-auth';
import { getCheckoutByIdForMerchant, serializeCheckoutMerchant } from '@/lib/merchant-checkouts';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const key = await authenticateMerchantApiKey(request);
    if (!key) {
        return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    const { id } = await params;
    const checkout = await getCheckoutByIdForMerchant(key.user_id, id);
    if (!checkout) {
        return NextResponse.json({ error: 'Checkout not found' }, { status: 404 });
    }

    return NextResponse.json(serializeCheckoutMerchant(checkout));
}
