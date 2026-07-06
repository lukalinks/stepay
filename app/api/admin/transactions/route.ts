import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAdminContext } from '@/lib/admin-auth';

export async function GET(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    try {
        const countRows =
            type && status
                ? await sql`
                    SELECT COUNT(*)::int AS c FROM transactions
                    WHERE type = ${type} AND status = ${status}
                `
                : type
                  ? await sql`
                      SELECT COUNT(*)::int AS c FROM transactions WHERE type = ${type}
                  `
                  : status
                    ? await sql`
                        SELECT COUNT(*)::int AS c FROM transactions WHERE status = ${status}
                    `
                    : await sql`SELECT COUNT(*)::int AS c FROM transactions`;

        const total = (countRows[0] as { c: number }).c;

        const data =
            type && status
                ? await sql`
                    SELECT id, type, amount_fiat, amount_xlm, status, reference, tx_hash, created_at, asset, deposit_memo, user_id
                    FROM transactions
                    WHERE type = ${type} AND status = ${status}
                    ORDER BY created_at DESC
                    LIMIT ${limit} OFFSET ${offset}
                `
                : type
                  ? await sql`
                      SELECT id, type, amount_fiat, amount_xlm, status, reference, tx_hash, created_at, asset, deposit_memo, user_id
                      FROM transactions
                      WHERE type = ${type}
                      ORDER BY created_at DESC
                      LIMIT ${limit} OFFSET ${offset}
                  `
                  : status
                    ? await sql`
                        SELECT id, type, amount_fiat, amount_xlm, status, reference, tx_hash, created_at, asset, deposit_memo, user_id
                        FROM transactions
                        WHERE status = ${status}
                        ORDER BY created_at DESC
                        LIMIT ${limit} OFFSET ${offset}
                    `
                    : await sql`
                        SELECT id, type, amount_fiat, amount_xlm, status, reference, tx_hash, created_at, asset, deposit_memo, user_id
                        FROM transactions
                        ORDER BY created_at DESC
                        LIMIT ${limit} OFFSET ${offset}
                    `;

        const txList = data as unknown as { user_id: string }[];
        const userIds = [...new Set(txList.map((t) => t.user_id))];
        let userMap = new Map<string, { id: string; email?: string; phone_number?: string }>();
        if (userIds.length) {
            const usersData = await sql`
                SELECT id, email, phone_number FROM users
                WHERE id IN ${sql(userIds)}
            `;
            const urows = usersData as unknown as { id: string; email?: string; phone_number?: string }[];
            userMap = new Map(urows.map((u) => [u.id, u]));
        }

        const transactions = (data as unknown as Record<string, unknown>[]).map((tx) => {
            const u = userMap.get(tx.user_id as string);
            return {
                id: tx.id,
                type: tx.type,
                asset: tx.asset || 'xlm',
                amountFiat: tx.amount_fiat,
                amountXlm: tx.amount_xlm,
                status: tx.status,
                reference: tx.reference,
                txHash: tx.tx_hash,
                createdAt: tx.created_at,
                depositMemo: tx.deposit_memo,
                user: u ? { id: u.id, email: u.email ?? '—', phone: u.phone_number ?? '—' } : null,
            };
        });

        return NextResponse.json({ transactions, total: total ?? 0 });
    } catch (err) {
        console.error('Admin transactions:', err);
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }
}
