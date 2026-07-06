import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAdminContext } from '@/lib/admin-auth';

export async function GET(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const days = Math.min(90, Math.max(7, parseInt(searchParams.get('days') || '30', 10)));

    try {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const [dailyVolume, typeBreakdown, statusBreakdown, signupDaily, failedRate] = await Promise.all([
            sql`
                SELECT DATE(created_at) AS day,
                       SUM(CASE WHEN type = 'BUY' AND status = 'COMPLETED' THEN amount_fiat ELSE 0 END) AS buy_zmw,
                       SUM(CASE WHEN type = 'SELL' AND status = 'COMPLETED' THEN amount_fiat ELSE 0 END) AS sell_zmw,
                       COUNT(*)::int AS tx_count
                FROM transactions
                WHERE created_at >= ${since}
                GROUP BY DATE(created_at)
                ORDER BY day ASC
            `,
            sql`
                SELECT type, COUNT(*)::int AS c FROM transactions
                WHERE created_at >= ${since}
                GROUP BY type ORDER BY c DESC
            `,
            sql`
                SELECT status, COUNT(*)::int AS c FROM transactions
                WHERE created_at >= ${since}
                GROUP BY status ORDER BY c DESC
            `,
            sql`
                SELECT DATE(created_at) AS day, COUNT(*)::int AS c
                FROM users WHERE created_at >= ${since}
                GROUP BY DATE(created_at) ORDER BY day ASC
            `,
            sql`
                SELECT
                    COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed,
                    COUNT(*)::int AS total
                FROM transactions WHERE created_at >= ${since}
            `,
        ]);

        const failed = failedRate[0] as { failed: number; total: number };
        const failedPct = failed.total > 0 ? Math.round((failed.failed / failed.total) * 1000) / 10 : 0;

        return NextResponse.json({
            days,
            dailyVolume: (dailyVolume as Record<string, unknown>[]).map((r) => ({
                day: r.day,
                buyZmw: Number(r.buy_zmw) || 0,
                sellZmw: Number(r.sell_zmw) || 0,
                txCount: r.tx_count,
            })),
            typeBreakdown,
            statusBreakdown,
            signupDaily: (signupDaily as Record<string, unknown>[]).map((r) => ({
                day: r.day,
                count: r.c,
            })),
            failedRatePct: failedPct,
            totalTx: failed.total,
            failedTx: failed.failed,
        });
    } catch (err) {
        console.error('Admin analytics:', err);
        return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
    }
}
