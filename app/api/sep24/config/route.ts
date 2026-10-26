import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { sql } from '@/lib/db';
import { getMarket, marketSupportsPayment } from '@/lib/markets';
import {
    assertAnchorConfig,
    fetchAnchorToml,
    fetchSep24Info,
    resolveAnchorEndpoints,
    sep24AssetLimits,
} from '@/lib/sep24';

/** Partner cash-rail config for the logged-in user's market (Zeam for ZA). */
export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rows = await sql`SELECT country_code, wallet_public FROM users WHERE id = ${userId} LIMIT 1`;
        const user = rows[0] as { country_code?: string; wallet_public?: string } | undefined;
        const market = getMarket(user?.country_code);

        if (!marketSupportsPayment(market.countryCode, 'stellar_anchor') || !market.anchor) {
            return NextResponse.json({
                enabled: false,
                comingSoon: market.comingSoon,
                countryCode: market.countryCode,
                countryName: market.countryName,
                flagEmoji: market.flagEmoji,
                reason: market.comingSoon
                    ? `Cash in/out coming soon in ${market.countryName}`
                    : 'Partner cash in/out is not available in your country',
            });
        }

        const anchor = assertAnchorConfig(market.anchor);
        const toml = await fetchAnchorToml(anchor.homeDomain);
        const endpoints = resolveAnchorEndpoints(toml);
        let info: Record<string, unknown> | null = null;
        try {
            info = await fetchSep24Info(endpoints.transferServer);
        } catch {
            info = null;
        }

        return NextResponse.json({
            enabled: true,
            comingSoon: false,
            countryCode: market.countryCode,
            countryName: market.countryName,
            flagEmoji: market.flagEmoji,
            currency: market.currency,
            partnerName: anchor.partnerName,
            homeDomain: anchor.homeDomain,
            assetCode: anchor.assetCode,
            walletPublic: user?.wallet_public || null,
            webAuthEndpoint: endpoints.webAuth,
            transferServer: endpoints.transferServer,
            networkPassphrase: endpoints.networkPassphrase,
            info,
            assetLimits: {
                deposit: sep24AssetLimits(info, 'deposit', anchor.assetCode),
                withdraw: sep24AssetLimits(info, 'withdraw', anchor.assetCode),
            },
        });
    } catch (err) {
        console.error('SEP-24 config:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load partner config' },
            { status: 500 }
        );
    }
}
