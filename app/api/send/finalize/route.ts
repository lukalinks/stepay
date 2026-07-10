import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { guardConfirmRequest } from '@/lib/confirm-api';
import { consumeConfirmedIntent, readClientPlan } from '@/lib/sign-intents';
import { finalizeSendClientTx, friendlySendError } from '@/lib/operations/send';
import { RateLimitError, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await guardConfirmRequest(userId, request);

        const body = await request.json().catch(() => ({}));
        const intentId = typeof body.intentId === 'string' ? body.intentId : '';
        const txHash = typeof body.txHash === 'string' ? body.txHash.trim() : '';
        if (!intentId || !txHash) {
            return NextResponse.json({ error: 'intentId and txHash are required' }, { status: 400 });
        }

        const intent = await consumeConfirmedIntent(intentId, userId);
        const plan = readClientPlan(intent);
        if (!plan) {
            return NextResponse.json({ error: 'Missing transaction plan.' }, { status: 400 });
        }

        try {
            const result = await finalizeSendClientTx(userId, intent.payload as Record<string, unknown>, plan, txHash, {
                intentId,
                request,
            });
            return NextResponse.json({
                success: true,
                txHash: result.txHash,
                claimUrl: result.claimUrl,
                pendingClaim: result.pendingClaim,
                successUrl: result.successUrl,
                message: result.message,
            });
        } catch (stellarErr) {
            return NextResponse.json({ error: friendlySendError(stellarErr) }, { status: 400 });
        }
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status, headers: { 'Retry-After': String(r.retryAfterSec) } });
        }
        const msg = err instanceof Error ? err.message : 'Failed to finalize send';
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}
