import { NextResponse } from 'next/server';
import { getPayLinkBySlug } from '@/lib/pay-links';
import { buildSep7PayUri } from '@/lib/sep7';

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

        const walletPublic = String(link.wallet_public || '');
        const asset = String(link.asset || 'usdc') as 'xlm' | 'usdc';
        const amount = link.amount != null ? Number(link.amount) : null;
        let sep7Uri: string | null = null;
        if (walletPublic) {
            try {
                sep7Uri = buildSep7PayUri({
                    destination: walletPublic,
                    amount,
                    asset,
                    msg: String(link.label || 'Pay on Stepay'),
                });
            } catch {
                sep7Uri = null;
            }
        }

        return NextResponse.json({
            slug: link.slug,
            label: link.label,
            amount: link.amount,
            asset: link.asset,
            recipientName: link.full_name,
            walletPublic: walletPublic || null,
            sep7Uri,
        });
    } catch (err) {
        console.error('Pay link GET:', err);
        return NextResponse.json({ error: 'Failed to load pay link' }, { status: 500 });
    }
}
