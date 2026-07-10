import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getMarket, marketToJson } from '@/lib/markets';
import { getRates, getFees, getLimits } from '@/lib/rates';
import { getUserCountryCode } from '@/lib/user-market';

/** Public endpoint — rates, fees, limits, and market metadata for the user's country. */
export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        const countryCode = userId ? await getUserCountryCode(userId) : undefined;
        const market = getMarket(countryCode);

        const [rates, fees, limits] = await Promise.all([getRates(), getFees(), getLimits()]);

        return NextResponse.json(
            {
                market: marketToJson(market),
                rates: {
                    xlm: { buy: rates.xlm_buy, sell: rates.xlm_sell },
                    usdc: { buy: rates.usdc_buy, sell: rates.usdc_sell },
                },
                fees: {
                    buyPercent: fees.buy_percent,
                    sellPercent: fees.sell_percent,
                },
                limits: {
                    minDeposit: limits.min_deposit_zmw,
                    maxDeposit: limits.max_deposit_zmw,
                    minWithdraw: limits.min_withdraw_zmw,
                    maxWithdraw: limits.max_withdraw_zmw,
                    minDepositZmw: limits.min_deposit_zmw,
                    maxDepositZmw: limits.max_deposit_zmw,
                    minWithdrawZmw: limits.min_withdraw_zmw,
                    maxWithdrawZmw: limits.max_withdraw_zmw,
                },
            },
            {
                headers: {
                    'Cache-Control': 'no-store, max-age=0',
                },
            }
        );
    } catch (err) {
        console.error('Rates API Error:', err);
        const market = getMarket();
        return NextResponse.json(
            {
                market: marketToJson(market),
                rates: { xlm: { buy: 3.5, sell: 3.5 }, usdc: { buy: 25, sell: 25 } },
                fees: { buyPercent: 0, sellPercent: 0 },
                limits: {
                    minDeposit: 4,
                    maxDeposit: 50000,
                    minWithdraw: 4,
                    maxWithdraw: 50000,
                    minDepositZmw: 4,
                    maxDepositZmw: 50000,
                    minWithdrawZmw: 4,
                    maxWithdrawZmw: 50000,
                },
            },
            { status: 200 }
        );
    }
}
