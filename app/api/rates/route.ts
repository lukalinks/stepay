import { NextResponse } from 'next/server';
import { getRates, getFees } from '@/lib/rates';

/** Public endpoint - returns current rates and fees for display */
export async function GET() {
    try {
        const [rates, fees] = await Promise.all([getRates(), getFees()]);
        return NextResponse.json({
            rates: {
                xlm: { buy: rates.xlm_buy, sell: rates.xlm_sell },
                usdc: { buy: rates.usdc_buy, sell: rates.usdc_sell },
            },
            fees: {
                buyPercent: fees.buy_percent,
                sellPercent: fees.sell_percent,
            },
        });
    } catch (err) {
        console.error('Rates API Error:', err);
        return NextResponse.json(
            { rates: { xlm: { buy: 3.5, sell: 3.5 }, usdc: { buy: 25, sell: 25 } }, fees: { buyPercent: 0, sellPercent: 0 } },
            { status: 200 }
        );
    }
}
