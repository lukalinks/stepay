import { NextResponse } from 'next/server';
import { getPayLinkBySlug } from '@/lib/pay-links';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const link = await getPayLinkBySlug(slug);
        if (!link) {
            return NextResponse.json({ error: 'Pay link not found' }, { status: 404 });
        }

        return NextResponse.json({
            slug: link.slug,
            label: link.label,
            amount: link.amount,
            asset: link.asset,
            recipientName: link.full_name,
        });
    } catch (err) {
        console.error('Pay link GET:', err);
        return NextResponse.json({ error: 'Failed to load pay link' }, { status: 500 });
    }
}
