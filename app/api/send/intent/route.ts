import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { createOutboundIntent } from '@/lib/intent-api';
import { parseSendPayload, validateSend } from '@/lib/operations/send';

export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const payload = parseSendPayload(body as Record<string, unknown>);
        await validateSend(userId, payload);

        const result = await createOutboundIntent(userId, 'SEND', payload as unknown as Record<string, unknown>, 'send');

        return NextResponse.json({
            ...result,
            summary: {
                mode: payload.mode,
                to: payload.mode === 'phone' ? payload.phone?.trim() : payload.to?.trim(),
                amount: payload.amount,
                asset: payload.asset,
                memo: payload.memo,
            },
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to prepare send';
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}
