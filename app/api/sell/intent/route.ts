import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { createOutboundIntent } from '@/lib/intent-api';
import { parseSellPayload, validateSell } from '@/lib/operations/sell';

export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        let payload = parseSellPayload(body as Record<string, unknown>);

        if (!payload.phone) {
            const userRows = await sql`
                SELECT phone_number FROM users WHERE id = ${userId} LIMIT 1
            `;
            const phone = (userRows[0] as { phone_number?: string } | undefined)?.phone_number;
            if (phone) payload = { ...payload, phone: String(phone) };
        }

        await validateSell(userId, payload);

        const result = await createOutboundIntent(userId, 'SELL', payload as unknown as Record<string, unknown>, 'sell');

        return NextResponse.json({
            success: true,
            ...result,
            summary: payload,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to prepare cash out';
        return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }
}
