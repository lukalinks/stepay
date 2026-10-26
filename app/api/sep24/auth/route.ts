import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { sql } from '@/lib/db';
import { getMarket, marketSupportsPayment } from '@/lib/markets';
import {
    assertAnchorConfig,
    buildAnchorChallengeUrl,
    cosignSep10ChallengeWithClientDomain,
    fetchAnchorToml,
    partnerAuthErrorHint,
    resolveAnchorEndpoints,
} from '@/lib/sep24';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { clientIp } from '@/lib/signer';

/** Proxy SEP-10 challenge from the market's anchor (MoneyGram / Zeam). */
export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('sep24-challenge', [ip, userId]), 40, 60 * 60 * 1000);

        const { searchParams } = new URL(request.url);
        const account = searchParams.get('account')?.trim() || '';
        if (!account.startsWith('G')) {
            return NextResponse.json({ error: 'account required' }, { status: 400 });
        }

        const rows = await sql`SELECT country_code, wallet_public FROM users WHERE id = ${userId} LIMIT 1`;
        const user = rows[0] as { country_code?: string; wallet_public?: string } | undefined;
        const market = getMarket(user?.country_code);
        if (!marketSupportsPayment(market.countryCode, 'stellar_anchor')) {
            return NextResponse.json({ error: 'Partner auth not available' }, { status: 400 });
        }
        if (user?.wallet_public && user.wallet_public.toUpperCase() !== account.toUpperCase()) {
            return NextResponse.json({ error: 'Account does not match your Stepay wallet' }, { status: 400 });
        }

        const anchor = assertAnchorConfig(market.anchor);
        const { webAuth, networkPassphrase } = resolveAnchorEndpoints(await fetchAnchorToml(anchor.homeDomain));
        const challengeUrl = buildAnchorChallengeUrl(webAuth, account, {
            requiresClientDomain: Boolean(anchor.requiresClientDomain),
        });
        const res = await fetch(challengeUrl, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json(
                {
                    error: partnerAuthErrorHint(
                        (data as { error?: string }).error,
                        anchor.requiresClientDomain
                    ),
                },
                { status: 502 }
            );
        }
        return NextResponse.json({
            ...(data as object),
            network_passphrase:
                (data as { network_passphrase?: string }).network_passphrase || networkPassphrase,
            requires_client_domain: Boolean(anchor.requiresClientDomain),
            partner_name: anchor.partnerName,
        });
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status });
        }
        console.error('SEP-24 auth GET:', err);
        return NextResponse.json({ error: 'Challenge failed' }, { status: 500 });
    }
}

/** Proxy SEP-10 token exchange; co-sign with Stepay SIGNING_KEY when required. */
export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('sep24-token', [ip, userId]), 40, 60 * 60 * 1000);

        const body = await request.json().catch(() => ({}));
        let transaction = typeof body.transaction === 'string' ? body.transaction.trim() : '';
        if (!transaction) {
            return NextResponse.json({ error: 'transaction required' }, { status: 400 });
        }

        const rows = await sql`SELECT country_code FROM users WHERE id = ${userId} LIMIT 1`;
        const market = getMarket((rows[0] as { country_code?: string } | undefined)?.country_code);
        if (!marketSupportsPayment(market.countryCode, 'stellar_anchor')) {
            return NextResponse.json({ error: 'Partner auth not available' }, { status: 400 });
        }

        const anchor = assertAnchorConfig(market.anchor);
        const { webAuth, networkPassphrase } = resolveAnchorEndpoints(
            await fetchAnchorToml(anchor.homeDomain)
        );

        if (anchor.requiresClientDomain) {
            try {
                transaction = cosignSep10ChallengeWithClientDomain(transaction, networkPassphrase);
            } catch (err) {
                console.error('SEP-24 client_domain cosign:', err);
                return NextResponse.json(
                    { error: 'Could not sign partner challenge with Stepay signing key' },
                    { status: 500 }
                );
            }
        }

        const res = await fetch(webAuth, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transaction }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json(
                {
                    error: partnerAuthErrorHint(
                        (data as { error?: string }).error,
                        anchor.requiresClientDomain
                    ),
                },
                { status: 400 }
            );
        }
        return NextResponse.json({
            ...(data as object),
            network_passphrase:
                (data as { network_passphrase?: string }).network_passphrase || networkPassphrase,
            partner_name: anchor.partnerName,
        });
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status });
        }
        console.error('SEP-24 auth POST:', err);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }
}
