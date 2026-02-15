import { NextResponse } from 'next/server';
import { getRates, getFees, getLimits } from '@/lib/rates';

/** Public endpoint - returns current rates, fees, and limits for display */
export async function GET() {
    try {
        const [rates, fees, limits] = await Promise.all([getRates(), getFees(), getLimits()]);
        return NextResponse.json({
            rates: {
                xlm: { buy: rates.xlm_buy, sell: rates.xlm_sell },
                usdc: { buy: rates.usdc_buy, sell: rates.usdc_sell },
            },
            fees: {
                buyPercent: fees.buy_percent,
                sellPercent: fees.sell_percent,
            },
            limits: {
                minDepositZmw: limits.min_deposit_zmw,
                maxDepositZmw: limits.max_deposit_zmw,
                minWithdrawZmw: limits.min_withdraw_zmw,
                maxWithdrawZmw: limits.max_withdraw_zmw,
            },
        });
    } catch (err) {
        console.error('Rates API Error:', err);
        return NextResponse.json(
            { rates: { xlm: { buy: 3.5, sell: 3.5 }, usdc: { buy: 25, sell: 25 } }, fees: { buyPercent: 0, sellPercent: 0 }, limits: { minDepositZmw: 4, maxDepositZmw: 50000, minWithdrawZmw: 4, maxWithdrawZmw: 50000 } },
            { status: 200 }
        );
    }
}
