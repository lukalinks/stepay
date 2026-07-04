import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { tryCompleteBuyDeposit, tryCompleteUserPendingDeposits } from '@/lib/complete-buy-deposit';
import { findBuyTransactionByReference } from '@/lib/deposit-claim';

/** POST: Check Lenco payment status and credit crypto for pending deposit(s). */
export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const reference = typeof body.reference === 'string' ? body.reference.trim() : '';

        if (reference) {
            const tx = await findBuyTransactionByReference(reference);
            if (!tx || String(tx.user_id) !== userId) {
                return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
            }

            const result = await tryCompleteBuyDeposit(reference, { userId });
            return NextResponse.json({
                reference,
                ...result,
                completed: result.status === 'completed',
            });
        }

        const results = await tryCompleteUserPendingDeposits(userId);
        const completed = results.filter((r) => r.status === 'completed').length;

        return NextResponse.json({ results, completed });
    } catch (error) {
        console.error('deposit confirm error:', error);
        return NextResponse.json({ error: 'Could not confirm deposit' }, { status: 500 });
    }
}
