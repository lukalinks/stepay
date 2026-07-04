import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { createOutboundIntent } from '@/lib/intent-api';
import { parseSwapPayload, validateSwap } from '@/lib/operations/swap';

export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const payload = parseSwapPayload(body as Record<string, unknown>);
        const { toAmount } = await validateSwap(userId, payload);

        const result = await createOutboundIntent(
            userId,
            'SWAP',
            { ...payload, quotedToAmount: toAmount } as unknown as Record<string, unknown>,
            'swap'
        );

        return NextResponse.json({
            ...result,
            summary: { ...payload, toAmount },
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to prepare swap';
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}
