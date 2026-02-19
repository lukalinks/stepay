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
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    try {
        let query = supabase
            .from('users')
            .select('id, email, phone_number, role, created_at, wallet_public', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (search) {
            query = query.or(`email.ilike.%${search}%,phone_number.ilike.%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        const users = (data ?? []).map((u) => ({
            id: u.id,
            email: u.email ?? '—',
            phone: u.phone_number ?? '—',
            role: u.role || 'user',
            createdAt: u.created_at,
            wallet: u.wallet_public ? `${u.wallet_public.slice(0, 8)}...` : '—',
        }));

        return NextResponse.json({ users, total: count ?? 0 });
    } catch (err) {
        console.error('Admin users:', err);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}
