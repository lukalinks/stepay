import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAdminContext } from '@/lib/admin-auth';
import { getAdminHealth } from '@/lib/admin-health';

export async function GET(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const today = new Date().toISOString().slice(0, 10);

        const [
            userCountRow,
            txCountRow,
            pendingTxs,
            failedCountRow,
            newUsersRow,
            todayBuy,
            todaySell,
            recentTxs,
        ] = await Promise.all([
            sql`SELECT COUNT(*)::int AS c FROM users`,
            sql`SELECT COUNT(*)::int AS c FROM transactions`,
            sql`
                SELECT id, type, reference, amount_fiat, amount_xlm, status, created_at, asset
                FROM transactions WHERE status IN ('PENDING', 'PROCESSING')
                ORDER BY created_at DESC
                LIMIT 10
            `,
            sql`SELECT COUNT(*)::int AS c FROM transactions WHERE status = 'FAILED'`,
            sql`
                SELECT COUNT(*)::int AS c FROM users
                WHERE created_at >= ${`${today}T00:00:00`}
            `,
            sql`
                SELECT amount_fiat FROM transactions
                WHERE type = 'BUY' AND status = 'COMPLETED' AND created_at >= ${`${today}T00:00:00`}
            `,
            sql`
                SELECT amount_fiat FROM transactions
                WHERE type = 'SELL' AND status = 'COMPLETED' AND created_at >= ${`${today}T00:00:00`}
            `,
            sql`
                SELECT id, type, reference, amount_fiat, amount_xlm, status, created_at, asset
                FROM transactions
                ORDER BY created_at DESC
                LIMIT 8
            `,
        ]);

        const userCount = (userCountRow[0] as { c: number }).c;
        const txCount = (txCountRow[0] as { c: number }).c;
        const failedCount = (failedCountRow[0] as { c: number }).c;
        const newUsersToday = (newUsersRow[0] as { c: number }).c;

        const todayBuyVolume = (todayBuy as { amount_fiat?: number }[]).reduce((s, t) => s + (t.amount_fiat ?? 0), 0);
        const todaySellVolume = (todaySell as { amount_fiat?: number }[]).reduce((s, t) => s + (t.amount_fiat ?? 0), 0);

        const healthData = await getAdminHealth();

        return NextResponse.json({
            users: userCount ?? 0,
            transactions: txCount ?? 0,
            pendingCount: (pendingTxs as unknown[]).length,
            failedCount: failedCount ?? 0,
            newUsersToday: newUsersToday ?? 0,
            pending: pendingTxs,
            recent: recentTxs,
            todayBuyVolume,
            todaySellVolume,
            todayVolume: todayBuyVolume + todaySellVolume,
            health: healthData.env,
            probes: healthData.probes,
            adminRole: ctx.role,
        });
    } catch (err) {
        console.error('Admin stats:', err);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
