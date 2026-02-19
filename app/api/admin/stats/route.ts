import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserIdFromRequest } from '@/lib/auth';

async function requireAdmin(request: Request): Promise<string | null> {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return null;
    const { data } = await supabase.from('users').select('role').eq('id', userId).single();
    return data?.role === 'admin' ? userId : null;
}

export async function GET(request: Request) {
    const adminId = await requireAdmin(request);
    if (!adminId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const today = new Date().toISOString().slice(0, 10);

        const [
            { count: userCount },
            { count: txCount },
            { data: pendingTxs },
            { data: todayBuy },
            { data: todaySell },
        ] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('transactions').select('*', { count: 'exact', head: true }),
            supabase.from('transactions').select('id, type, reference, amount_fiat, amount_xlm, status, created_at, asset').eq('status', 'PENDING'),
            supabase.from('transactions').select('amount_fiat, amount_xlm').eq('type', 'BUY').eq('status', 'COMPLETED').gte('created_at', `${today}T00:00:00`),
            supabase.from('transactions').select('amount_fiat, amount_xlm').eq('type', 'SELL').eq('status', 'COMPLETED').gte('created_at', `${today}T00:00:00`),
        ]);

        const todayBuyVolume = (todayBuy ?? []).reduce((s, t) => s + (t.amount_fiat ?? 0), 0);
        const todaySellVolume = (todaySell ?? []).reduce((s, t) => s + (t.amount_fiat ?? 0), 0);

        return NextResponse.json({
            users: userCount ?? 0,
            transactions: txCount ?? 0,
            pendingCount: pendingTxs?.length ?? 0,
            pending: pendingTxs ?? [],
            todayBuyVolume,
            todaySellVolume,
            todayVolume: todayBuyVolume + todaySellVolume,
        });
    } catch (err) {
        console.error('Admin stats:', err);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
