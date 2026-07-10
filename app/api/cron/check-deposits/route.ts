import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { tryCompleteBuyDeposit } from '@/lib/complete-buy-deposit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET: Called by Vercel Cron to poll Lenco for pending deposits (fallback when webhook fails) */
export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET?.trim();
    if (!cronSecret) {
        console.error('Cron check-deposits: CRON_SECRET is not set');
        return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const pendingTxs = await sql`
            SELECT reference FROM transactions
            WHERE type = 'BUY' AND status = 'PENDING' AND created_at >= ${since}
            ORDER BY created_at ASC
            LIMIT 20
        `;

        if (!pendingTxs.length) {
            return NextResponse.json({ checked: 0, completed: 0 });
        }

        let completed = 0;
        for (const tx of pendingTxs as unknown as { reference: string }[]) {
            const reference = String(tx.reference ?? '').trim();
            if (!reference) continue;
            const result = await tryCompleteBuyDeposit(reference);
            if (result.status === 'completed') completed++;
        }

        return NextResponse.json({ checked: pendingTxs.length, completed });
    } catch (error) {
        console.error('Cron check-deposits error:', error);
        return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
    }
}
