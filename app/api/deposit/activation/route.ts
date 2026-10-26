import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { sql } from '@/lib/db';
import { getRates } from '@/lib/rates';
import { activationQuoteToJson, quoteWalletActivation } from '@/lib/wallet-activation';

/** GET ?asset=usdc|xlm — one-time network activation quote for the signed-in wallet. */
export async function GET(request: Request) {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const assetParam = (url.searchParams.get('asset') || 'usdc').toLowerCase();
    const asset = assetParam === 'xlm' ? 'xlm' : 'usdc';

    const userRows = await sql`
        SELECT wallet_public FROM users WHERE id = ${userId} LIMIT 1
    `;
    const walletPublic = String((userRows[0] as { wallet_public?: string } | undefined)?.wallet_public ?? '').trim();
    if (!walletPublic) {
        return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const rates = await getRates();
    const quote = await quoteWalletActivation(walletPublic, asset, rates);

    return NextResponse.json(
        { activation: activationQuoteToJson(quote) },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
}
