import { NextResponse } from 'next/server';
import { getCheckoutByToken, serializeCheckoutPublicWithQuote } from '@/lib/merchant-checkouts';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;
        const checkout = await getCheckoutByToken(token);
        if (!checkout) {
            return NextResponse.json({ error: 'Checkout not found' }, { status: 404 });
        }
        return NextResponse.json(await serializeCheckoutPublicWithQuote(checkout));
    } catch (err) {
        console.error('Checkout GET:', err);
        return NextResponse.json({ error: 'Failed to load checkout' }, { status: 500 });
    }
}
