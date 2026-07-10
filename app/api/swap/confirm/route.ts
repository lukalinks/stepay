import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { guardConfirmRequest } from '@/lib/confirm-api';
import { coerceIntentPayload } from '@/lib/intent-payload';
import { hasServerStoredSecret } from '@/lib/wallet-custody';
import { verifyAndConsumeIntent, verifyIntentForClientSign, readClientPlan, reverifyConfirmedIntentCode } from '@/lib/sign-intents';
import { buildSwapClientPlan, executeSwap, parseSwapPayload } from '@/lib/operations/swap';
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
        const confirmCode = typeof body.confirmCode === 'string' ? body.confirmCode : '';
        if (!intentId || !confirmCode) {
            return NextResponse.json({ error: 'intentId and confirmCode are required' }, { status: 400 });
        }

        if (await hasServerStoredSecret(userId)) {
            const intent = await verifyAndConsumeIntent(intentId, userId, confirmCode);
            const payload = parseSwapPayload(coerceIntentPayload(intent.payload));
            const result = await executeSwap(userId, payload, { intentId, request });
            return NextResponse.json(result);
        }

        const intentRows = await sql`
            SELECT payload, status FROM sign_intents WHERE id = ${intentId} AND user_id = ${userId} LIMIT 1
        `;
        const row = intentRows[0] as { payload?: unknown; status?: string } | undefined;
        if (!row) {
            return NextResponse.json({ error: 'Confirmation request not found.' }, { status: 400 });
        }

        const intentPayload = coerceIntentPayload(row.payload);

        if (row.status === 'confirmed') {
            await reverifyConfirmedIntentCode(intentId, userId, confirmCode);
            const plan = readClientPlan({
                id: intentId,
                user_id: userId,
                type: 'SWAP',
                payload: intentPayload,
                status: row.status,
                attempts: 0,
                expires_at: '',
            });
            if (!plan) {
                return NextResponse.json({ error: 'Missing transaction plan. Please start swap again.' }, { status: 400 });
            }
            return NextResponse.json({
                success: true,
                requiresClientSign: true,
                intentId,
                plan,
            });
        }

        if (row.status !== 'pending') {
            return NextResponse.json({ error: 'This confirmation request is no longer valid.' }, { status: 400 });
        }

        const payload = parseSwapPayload(intentPayload);
        const plan = await buildSwapClientPlan(userId, payload);
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
            return NextResponse.json({ error: r.error }, { status: r.status, headers: { 'Retry-After': String(r.retryAfterSec) } });
        }
        const msg = err instanceof Error ? err.message : 'Failed to confirm swap';
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}
