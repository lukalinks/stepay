import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { sql } from '@/lib/db';
import { getMarket, marketSupportsPayment } from '@/lib/markets';
import {
    assertAnchorConfig,
    fetchAnchorToml,
    fetchSep24Info,
    friendlySep24InteractiveError,
    resolveAnchorEndpoints,
    sep24AssetLimits,
    startSep24Interactive,
} from '@/lib/sep24';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { clientIp } from '@/lib/signer';

/** Start Zeam (SEP-24) interactive deposit or withdraw. */
export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('sep24-interactive', [ip, userId]), 30, 60 * 60 * 1000);

        const body = await request.json().catch(() => ({}));
        const token = typeof body.token === 'string' ? body.token.trim() : '';
        const kind = body.kind === 'withdraw' ? 'withdraw' : 'deposit';
        const account = typeof body.account === 'string' ? body.account.trim() : '';
        const amount = body.amount != null ? body.amount : null;

        if (!token || !account.startsWith('G')) {
            return NextResponse.json({ error: 'token and account required' }, { status: 400 });
        }

        const rows = await sql`SELECT country_code, wallet_public FROM users WHERE id = ${userId} LIMIT 1`;
        const user = rows[0] as { country_code?: string; wallet_public?: string } | undefined;
        const market = getMarket(user?.country_code);

        if (!marketSupportsPayment(market.countryCode, 'stellar_anchor') || !market.anchor) {
            return NextResponse.json(
                {
                    error: market.comingSoon
                        ? `Cash in/out coming soon in ${market.countryName}`
                        : 'Partner cash in/out is not available',
                },
                { status: 400 }
            );
        }

        if (user?.wallet_public && user.wallet_public.toUpperCase() !== account.toUpperCase()) {
            return NextResponse.json({ error: 'Account does not match your Stepay wallet' }, { status: 400 });
        }

        const anchor = assertAnchorConfig(market.anchor);
        const { transferServer, networkPassphrase } = resolveAnchorEndpoints(
            await fetchAnchorToml(anchor.homeDomain)
        );
        const info = await fetchSep24Info(transferServer).catch(() => null);
        const limits = sep24AssetLimits(info, kind, anchor.assetCode);
        const amt = amount != null && amount !== '' ? Number(amount) : NaN;
        if (!Number.isFinite(amt) || amt < limits.min) {
            return NextResponse.json(
                {
                    error: `MoneyGram’s minimum is ${limits.min} USDC. Enter at least ${limits.min} and try again.`,
                },
                { status: 400 }
            );
        }
        if (limits.max != null && amt > limits.max) {
            return NextResponse.json(
                {
                    error: `MoneyGram’s maximum is ${limits.max} USDC. Enter a smaller amount.`,
                },
                { status: 400 }
            );
        }
        const result = await startSep24Interactive({
            transferServer,
            token,
            kind,
            account,
            assetCode: anchor.assetCode,
            amount,
            partnerName: anchor.partnerName,
        });

        return NextResponse.json({
            id: result.id,
            url: result.url,
            type: result.type,
            partnerName: anchor.partnerName,
            assetCode: anchor.assetCode,
            kind,
            networkPassphrase,
            homeDomain: anchor.homeDomain,
        });
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status });
        }
        const msg = err instanceof Error ? err.message : 'Could not start checkout';
        console.error('SEP-24 interactive:', msg);
        return NextResponse.json({ error: friendlySep24InteractiveError(msg) }, { status: 502 });
    }
}
