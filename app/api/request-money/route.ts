import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { createMoneyRequest, listMoneyRequestsForUser } from '@/lib/money-requests';

export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const requests = await listMoneyRequestsForUser(userId);
        const origin = process.env.AUTH_URL?.replace(/\/$/, '') || 'http://localhost:3000';
        return NextResponse.json({
            requests: (requests as Record<string, unknown>[]).map((r) => ({
                id: r.id,
                amount: r.amount,
                asset: r.asset,
                note: r.note,
                status: r.status,
                payUrl: `${origin}/pay/request/${r.pay_token}`,
                expiresAt: r.expires_at,
                createdAt: r.created_at,
            })),
        });
    } catch (err) {
        console.error('Request money GET:', err);
        return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const amount = Number(body.amount);
        const asset = body.asset === 'xlm' ? 'xlm' : 'usdc';
        const payerPhone = typeof body.payerPhone === 'string' ? body.payerPhone.trim() : undefined;
        const note = typeof body.note === 'string' ? body.note.trim().slice(0, 140) : undefined;

        if (isNaN(amount) || amount <= 0) {
            return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 });
        }
        if (asset === 'usdc' && amount < 1) {
            return NextResponse.json({ error: 'Minimum 1 USDC' }, { status: 400 });
        }
        if (asset === 'xlm' && amount < 0.1) {
            return NextResponse.json({ error: 'Minimum 0.1 XLM' }, { status: 400 });
        }

        const result = await createMoneyRequest({
            requesterId: userId,
            amount,
            asset,
            payerPhone,
            note,
        });

        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create request';
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}
