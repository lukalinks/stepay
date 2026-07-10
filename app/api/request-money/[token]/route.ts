import { NextResponse } from 'next/server';
import { getMoneyRequestByToken } from '@/lib/money-requests';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;
        const req = await getMoneyRequestByToken(token);
        if (!req) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        return NextResponse.json({
            amount: req.amount,
            asset: req.asset,
            note: req.note,
            requesterName: req.requester_name,
            requesterPhone: req.requester_phone,
            status: req.status,
            expiresAt: req.expires_at,
            expired: new Date(String(req.expires_at)).getTime() < Date.now(),
        });
    } catch (err) {
        console.error('Request token GET:', err);
        return NextResponse.json({ error: 'Failed to load request' }, { status: 500 });
    }
}
