import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const transactions = await sql`
            SELECT * FROM transactions
            WHERE user_id = ${userId}
            ORDER BY created_at DESC
            LIMIT 100
        `;

        const forFrontend = (transactions as Record<string, unknown>[]).map((tx) => ({
            id: tx.id,
            type: tx.type,
            asset: tx.asset || 'xlm',
            amountFiat: tx.amount_fiat,
            amountXLM: tx.amount_xlm,
            status: tx.status,
            reference: tx.reference,
            txHash: tx.tx_hash,
            createdAt: tx.created_at,
            depositMemo: tx.deposit_memo,
        }));

        return NextResponse.json({ transactions: forFrontend });
    } catch (err) {
        console.error('Transactions API Error:', err);
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }
}
