import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

async function requireAdmin() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('stepay_user')?.value;
    if (!userId) return null;
    const { data } = await supabase.from('users').select('role').eq('id', userId).single();
    return data?.role === 'admin' ? userId : null;
}

export async function GET(request: Request) {
    const adminId = await requireAdmin();
    if (!adminId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // BUY, SELL, SEND
    const status = searchParams.get('status'); // PENDING, COMPLETED, FAILED
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    try {
        let query = supabase
            .from('transactions')
            .select('id, type, amount_fiat, amount_xlm, status, reference, tx_hash, created_at, asset, deposit_memo, user_id', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (type) query = query.eq('type', type);
        if (status) query = query.eq('status', status);

        const { data, error, count } = await query;

        if (error) throw error;

        const userIds = [...new Set((data ?? []).map((t: { user_id: string }) => t.user_id))];
        const { data: usersData } = userIds.length
            ? await supabase.from('users').select('id, email, phone_number').in('id', userIds)
            : { data: [] };

        const userMap = new Map((usersData ?? []).map((u: { id: string; email?: string; phone_number?: string }) => [u.id, u]));

        const transactions = (data ?? []).map((tx: Record<string, unknown>) => {
            const user = userMap.get(tx.user_id as string);
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
                user: user ? { id: user.id, email: user.email ?? '—', phone: user.phone_number ?? '—' } : null,
            };
        });

        return NextResponse.json({ transactions, total: count ?? 0 });
    } catch (err) {
        console.error('Admin transactions:', err);
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }
}
