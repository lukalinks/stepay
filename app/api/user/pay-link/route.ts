import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getOrCreatePayLink, updatePayLink } from '@/lib/pay-links';

export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const link = await getOrCreatePayLink(userId);
        return NextResponse.json(link);
    } catch (err) {
        console.error('User pay-link GET:', err);
        return NextResponse.json({ error: 'Failed to load pay link' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        await updatePayLink(userId, {
            label: typeof body.label === 'string' ? body.label.trim().slice(0, 80) : undefined,
            amount: body.amount === null || body.amount === '' ? null : Number(body.amount) || undefined,
            asset: body.asset === 'xlm' ? 'xlm' : body.asset === 'usdc' ? 'usdc' : undefined,
        });

        const link = await getOrCreatePayLink(userId);
        return NextResponse.json({ success: true, ...link });
    } catch (err) {
        console.error('User pay-link PATCH:', err);
        return NextResponse.json({ error: 'Failed to update pay link' }, { status: 500 });
    }
}
