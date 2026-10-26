import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAdminContext } from '@/lib/admin-auth';

export async function GET(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const q = searchParams.get('q')?.trim() || '';
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const pattern = q ? `%${q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%` : '';

    try {
        const countRows = await sql`
            SELECT COUNT(*)::int AS c
            FROM transactions t
            LEFT JOIN users u ON u.id = t.user_id
            WHERE (${type} = '' OR t.type = ${type})
              AND (${status} = '' OR t.status = ${status})
              AND (
                ${q} = ''
                OR t.reference ILIKE ${pattern} ESCAPE '\\'
                OR COALESCE(t.deposit_memo, '') ILIKE ${pattern} ESCAPE '\\'
                OR COALESCE(t.tx_hash, '') ILIKE ${pattern} ESCAPE '\\'
                OR COALESCE(u.email, '') ILIKE ${pattern} ESCAPE '\\'
                OR COALESCE(u.phone_number, '') ILIKE ${pattern} ESCAPE '\\'
              )
        `;
        const total = (countRows[0] as { c: number }).c;

        const data = await sql`
            SELECT t.id, t.type, t.amount_fiat, t.amount_xlm, t.status, t.reference, t.tx_hash,
                   t.created_at, t.asset, t.deposit_memo, t.user_id,
                   u.email AS user_email, u.phone_number AS user_phone
            FROM transactions t
            LEFT JOIN users u ON u.id = t.user_id
            WHERE (${type} = '' OR t.type = ${type})
              AND (${status} = '' OR t.status = ${status})
              AND (
                ${q} = ''
                OR t.reference ILIKE ${pattern} ESCAPE '\\'
                OR COALESCE(t.deposit_memo, '') ILIKE ${pattern} ESCAPE '\\'
                OR COALESCE(t.tx_hash, '') ILIKE ${pattern} ESCAPE '\\'
                OR COALESCE(u.email, '') ILIKE ${pattern} ESCAPE '\\'
                OR COALESCE(u.phone_number, '') ILIKE ${pattern} ESCAPE '\\'
              )
            ORDER BY t.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const transactions = (data as Record<string, unknown>[]).map((tx) => ({
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
            user: tx.user_id
                ? {
                      id: tx.user_id,
                      email: (tx.user_email as string) ?? '—',
                      phone: (tx.user_phone as string) ?? '—',
                  }
                : null,
        }));

        return NextResponse.json({ transactions, total: total ?? 0 });
    } catch (err) {
        console.error('Admin transactions:', err);
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }
}
