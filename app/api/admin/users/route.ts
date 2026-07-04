import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

async function requireAdmin(request: Request): Promise<string | null> {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return null;
    const rows = await sql`
        SELECT role FROM users WHERE id = ${userId} LIMIT 1
    `;
    return (rows[0] as { role?: string } | undefined)?.role === 'admin' ? userId : null;
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
        const pattern = `%${search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;

        const countRows = search
            ? await sql`
                SELECT COUNT(*)::int AS c FROM users
                WHERE email ILIKE ${pattern} ESCAPE '\\' OR phone_number ILIKE ${pattern} ESCAPE '\\'
            `
            : await sql`SELECT COUNT(*)::int AS c FROM users`;

        const total = (countRows[0] as { c: number }).c;

        const data = search
            ? await sql`
                SELECT id, email, phone_number, role, created_at, wallet_public, country_code, kyc_tier FROM users
                WHERE email ILIKE ${pattern} ESCAPE '\\' OR phone_number ILIKE ${pattern} ESCAPE '\\'
                ORDER BY created_at DESC
                LIMIT ${limit} OFFSET ${offset}
            `
            : await sql`
                SELECT id, email, phone_number, role, created_at, wallet_public, country_code, kyc_tier FROM users
                ORDER BY created_at DESC
                LIMIT ${limit} OFFSET ${offset}
            `;

        const users = (data as Record<string, unknown>[]).map((u) => ({
            id: u.id,
            email: u.email ?? '—',
            phone: u.phone_number ?? '—',
            role: u.role || 'user',
            createdAt: u.created_at,
            wallet: u.wallet_public ? String(u.wallet_public) : '',
            walletShort: u.wallet_public ? `${String(u.wallet_public).slice(0, 8)}…` : '—',
            countryCode: u.country_code ?? 'ZM',
            kycTier: u.kyc_tier ?? 'basic',
        }));

        return NextResponse.json({ users, total: total ?? 0 });
    } catch (err) {
        console.error('Admin users:', err);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}
