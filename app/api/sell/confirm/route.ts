import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { guardConfirmRequest } from '@/lib/confirm-api';
import { hasServerStoredSecret } from '@/lib/wallet-custody';
import { verifyAndConsumeIntent, verifyIntentForClientSign } from '@/lib/sign-intents';
import { buildSellClientPlan, executeSell, parseSellPayload } from '@/lib/operations/sell';
import { RateLimitError, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        await guardConfirmRequest(userId, request);

        const body = await request.json().catch(() => ({}));
        const intentId = typeof body.intentId === 'string' ? body.intentId : '';
        const confirmCode = typeof body.confirmCode === 'string' ? body.confirmCode : '';
        if (!intentId || !confirmCode) {
            return NextResponse.json({ success: false, error: 'intentId and confirmCode are required' }, { status: 400 });
        }

        if (await hasServerStoredSecret(userId)) {
            const intent = await verifyAndConsumeIntent(intentId, userId, confirmCode);
            const payload = parseSellPayload(intent.payload as Record<string, unknown>);
            const result = await executeSell(userId, payload, { intentId, request });
            return NextResponse.json(result);
        }

        const intentRows = await sql`
            SELECT payload FROM sign_intents WHERE id = ${intentId} AND user_id = ${userId} LIMIT 1
        `;
        const pendingPayload = (intentRows[0] as { payload?: Record<string, unknown> } | undefined)?.payload;
        if (!pendingPayload) {
            return NextResponse.json({ success: false, error: 'Confirmation request not found.' }, { status: 400 });
        }

        const payload = parseSellPayload(pendingPayload);
        const plan = await buildSellClientPlan(userId, payload);
        await verifyIntentForClientSign(intentId, userId, confirmCode, plan as Record<string, unknown>);

        return NextResponse.json({
            success: true,
            requiresClientSign: true,
            intentId,
            plan,
        });
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ success: false, error: r.error }, { status: r.status, headers: { 'Retry-After': String(r.retryAfterSec) } });
        }
        const msg = err instanceof Error ? err.message : 'Failed to confirm cash out';
        return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }
}
