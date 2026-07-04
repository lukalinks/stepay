import { NextResponse } from 'next/server';
import { getPendingTransferByToken, claimPendingTransfer } from '@/lib/phone-pay';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;
        const pending = await getPendingTransferByToken(token);
        if (!pending) {
            return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
        }

        return NextResponse.json({
            amount: pending.amount,
            asset: pending.asset,
            recipientPhone: pending.recipient_phone,
            senderName: pending.sender_name,
            status: pending.status,
            expiresAt: pending.expires_at,
            expired: new Date(String(pending.expires_at)).getTime() < Date.now(),
        });
    } catch (err) {
        console.error('Claim GET:', err);
        return NextResponse.json({ error: 'Failed to load transfer' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Sign in to claim this transfer' }, { status: 401 });
        }

        const { token } = await params;
        const result = await claimPendingTransfer(token, userId);
        return NextResponse.json({ success: true, txHash: result.txHash });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to claim';
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}
