import { NextResponse } from 'next/server';
import { parsePositiveDecimal } from '@/lib/parse-amount';
import { getFees, getRates, swapQuote } from '@/lib/rates';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from') as 'xlm' | 'usdc' | null;
        const to = searchParams.get('to') as 'xlm' | 'usdc' | null;
        const amount = parsePositiveDecimal(searchParams.get('amount'));

        if (!from || !to || from === to || amount == null) {
            return NextResponse.json({ error: 'Invalid quote parameters' }, { status: 400 });
        }

        const [rates, fees] = await Promise.all([getRates(), getFees()]);
        const { toAmount, zmwValue } = swapQuote(amount, from, to, rates, fees);

        return NextResponse.json({
            from,
            to,
            fromAmount: amount,
            toAmount: Number(toAmount.toFixed(from === 'xlm' ? 7 : 2)),
            zmwValue: Number(zmwValue.toFixed(2)),
        });
    } catch (err) {
        console.error('Swap quote error:', err);
        return NextResponse.json({ error: 'Failed to quote swap' }, { status: 500 });
    }
}

export async function POST() {
    return NextResponse.json(
        {
            error: 'Swap requires confirmation. Use POST /api/swap/intent then POST /api/swap/confirm with your 6-digit code.',
        },
        { status: 400 }
    );
}
