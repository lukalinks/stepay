import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAdminContext } from '@/lib/admin-auth';

export async function GET(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const kyc = searchParams.get('kyc')?.trim().toLowerCase() || '';
    const role = searchParams.get('role')?.trim().toLowerCase() || '';
    const country = searchParams.get('country')?.trim().toUpperCase() || '';
    const status = searchParams.get('status')?.trim().toLowerCase() || ''; // active | suspended | all
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0);

    try {
        const pattern = `%${search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
        const hasSearch = Boolean(search);
        const kycFilter = kyc === 'verified' || kyc === 'basic' ? kyc : '';
        const roleFilter = ['user', 'admin', 'admin_ops', 'admin_support'].includes(role) ? role : '';
        const countryFilter = country && country.length === 2 ? country : '';
        const suspendedOnly = status === 'suspended';
        const activeOnly = status === 'active';

        const [countRows, data, summaryRows, countries] = await Promise.all([
            sql`
                SELECT COUNT(*)::int AS c FROM users
                WHERE (${!hasSearch} OR email ILIKE ${pattern} ESCAPE '\\'
                    OR phone_number ILIKE ${pattern} ESCAPE '\\'
                    OR coalesce(full_name, '') ILIKE ${pattern} ESCAPE '\\')
                  AND (${!kycFilter} OR lower(coalesce(kyc_tier, 'basic')) = ${kycFilter})
                  AND (${!roleFilter} OR lower(coalesce(role, 'user')) = ${roleFilter})
                  AND (${!countryFilter} OR upper(coalesce(country_code, 'ZM')) = ${countryFilter})
                  AND (${!suspendedOnly} OR suspended = true)
                  AND (${!activeOnly} OR coalesce(suspended, false) = false)
            `,
            sql`
                SELECT id, email, phone_number, role, created_at, wallet_public, country_code, kyc_tier,
                       full_name, suspended, avatar_url
                FROM users
                WHERE (${!hasSearch} OR email ILIKE ${pattern} ESCAPE '\\'
                    OR phone_number ILIKE ${pattern} ESCAPE '\\'
                    OR coalesce(full_name, '') ILIKE ${pattern} ESCAPE '\\')
                  AND (${!kycFilter} OR lower(coalesce(kyc_tier, 'basic')) = ${kycFilter})
                  AND (${!roleFilter} OR lower(coalesce(role, 'user')) = ${roleFilter})
                  AND (${!countryFilter} OR upper(coalesce(country_code, 'ZM')) = ${countryFilter})
                  AND (${!suspendedOnly} OR suspended = true)
                  AND (${!activeOnly} OR coalesce(suspended, false) = false)
                ORDER BY created_at DESC
                LIMIT ${limit} OFFSET ${offset}
            `,
            sql`
                SELECT
                    COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE lower(coalesce(kyc_tier, 'basic')) = 'verified')::int AS verified,
                    COUNT(*) FILTER (WHERE coalesce(suspended, false) = true)::int AS suspended,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS new_7d,
                    COUNT(*) FILTER (WHERE role IN ('admin', 'admin_ops', 'admin_support'))::int AS staff
                FROM users
            `,
            sql`
                SELECT upper(coalesce(country_code, 'ZM')) AS code, COUNT(*)::int AS c
                FROM users
                GROUP BY upper(coalesce(country_code, 'ZM'))
                ORDER BY c DESC
            `,
        ]);

        const total = (countRows[0] as { c: number }).c;
        const summary = summaryRows[0] as {
            total: number;
            verified: number;
            suspended: number;
            new_7d: number;
            staff: number;
        };

        const users = (data as Record<string, unknown>[]).map((u) => ({
            id: u.id,
            email: u.email ?? '',
            phone: u.phone_number ?? '',
            fullName: u.full_name ?? '',
            role: u.role || 'user',
            createdAt: u.created_at,
            wallet: u.wallet_public ? String(u.wallet_public) : '',
            walletShort: u.wallet_public ? `${String(u.wallet_public).slice(0, 6)}…${String(u.wallet_public).slice(-4)}` : '',
            countryCode: String(u.country_code ?? 'ZM').toUpperCase(),
            kycTier: String(u.kyc_tier ?? 'basic').toLowerCase(),
            suspended: Boolean(u.suspended),
            avatarUrl: u.avatar_url ? String(u.avatar_url) : null,
        }));

        return NextResponse.json({
            users,
            total: total ?? 0,
            summary: {
                total: Number(summary?.total ?? 0),
                verified: Number(summary?.verified ?? 0),
                suspended: Number(summary?.suspended ?? 0),
                new7d: Number(summary?.new_7d ?? 0),
                staff: Number(summary?.staff ?? 0),
            },
            countries: (countries as unknown as Array<{ code: string; c: number }>).map((r) => ({
                code: r.code,
                count: r.c,
            })),
        });
    } catch (err) {
        console.error('Admin users:', err);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}
