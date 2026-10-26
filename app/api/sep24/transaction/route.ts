import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { sql } from '@/lib/db';
import { getMarket, marketSupportsPayment } from '@/lib/markets';
import {
    assertAnchorConfig,
    fetchAnchorToml,
    fetchSep24Transaction,
    resolveAnchorEndpoints,
} from '@/lib/sep24';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { clientIp } from '@/lib/signer';

/** Proxy SEP-24 transaction status for MoneyGram (and other anchors). */
export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('sep24-tx', [ip, userId]), 120, 60 * 60 * 1000);

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id')?.trim() || '';
        const token = searchParams.get('token')?.trim() || '';
        if (!id || !token) {
            return NextResponse.json({ error: 'id and token required' }, { status: 400 });
        }

        const rows = await sql`SELECT country_code FROM users WHERE id = ${userId} LIMIT 1`;
        const market = getMarket((rows[0] as { country_code?: string } | undefined)?.country_code);
        if (!marketSupportsPayment(market.countryCode, 'stellar_anchor') || !market.anchor) {
            return NextResponse.json({ error: 'Partner cash in/out is not available' }, { status: 400 });
        }

        const anchor = assertAnchorConfig(market.anchor);
        const { transferServer, networkPassphrase } = resolveAnchorEndpoints(
            await fetchAnchorToml(anchor.homeDomain)
        );
        const transaction = await fetchSep24Transaction({ transferServer, token, id });

        return NextResponse.json({
            transaction,
            partnerName: anchor.partnerName,
            assetCode: anchor.assetCode,
            networkPassphrase,
        });
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status });
        }
        const msg = err instanceof Error ? err.message : 'Could not load status';
        console.error('SEP-24 transaction:', msg);
        return NextResponse.json({ error: msg }, { status: 502 });
    }
}
