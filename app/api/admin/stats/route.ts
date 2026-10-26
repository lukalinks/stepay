import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { canRunOps, getAdminContext } from '@/lib/admin-auth';
import { getAdminHealth } from '@/lib/admin-health';
import { getTreasurySnapshot } from '@/lib/admin-treasury';
import { listStuckTransactions } from '@/lib/recover-stuck-ops';

export async function GET(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const today = new Date().toISOString().slice(0, 10);
        const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

        const [
            userCountRow,
            txCountRow,
            pendingTxs,
            pendingCountRow,
            failedCountRow,
            newUsersRow,
            todayBuy,
            todaySell,
            recentTxs,
            stuck,
            merchantCountRow,
            usdcVolumeRow,
            weekVolumeRow,
            priorWeekVolumeRow,
            weekTxRow,
            priorWeekTxRow,
            weekUsersRow,
            priorWeekUsersRow,
            weekPayoutsRow,
            priorWeekPayoutsRow,
            kycRows,
            unresolvedAlertsRow,
        ] = await Promise.all([
            sql`SELECT COUNT(*)::int AS c FROM users`,
            sql`SELECT COUNT(*)::int AS c FROM transactions`,
            sql`
                SELECT id, type, reference, amount_fiat, amount_xlm, status, created_at, asset
                FROM transactions WHERE status IN ('PENDING', 'PROCESSING')
                ORDER BY created_at DESC
                LIMIT 10
            `,
            sql`
                SELECT COUNT(*)::int AS c FROM transactions
                WHERE status IN ('PENDING', 'PROCESSING')
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
                SELECT t.id, t.type, t.reference, t.amount_fiat, t.amount_xlm, t.status, t.created_at, t.asset,
                       u.email AS user_email, u.full_name AS user_name
                FROM transactions t
                LEFT JOIN users u ON u.id = t.user_id
                ORDER BY t.created_at DESC
                LIMIT 12
            `,
            listStuckTransactions(50),
            sql`SELECT COUNT(DISTINCT user_id)::int AS c FROM merchant_api_keys WHERE revoked_at IS NULL`,
            sql`
                SELECT COALESCE(SUM(amount_xlm), 0)::float AS vol
                FROM transactions
                WHERE status = 'COMPLETED' AND lower(coalesce(asset, 'xlm')) = 'usdc'
                  AND created_at >= ${since7}
            `,
            sql`
                SELECT COALESCE(SUM(amount_fiat), 0)::float AS vol
                FROM transactions
                WHERE status = 'COMPLETED' AND created_at >= ${since7}
            `,
            sql`
                SELECT COALESCE(SUM(amount_fiat), 0)::float AS vol
                FROM transactions
                WHERE status = 'COMPLETED'
                  AND created_at >= ${since14} AND created_at < ${since7}
            `,
            sql`
                SELECT COUNT(*)::int AS c FROM transactions WHERE created_at >= ${since7}
            `,
            sql`
                SELECT COUNT(*)::int AS c FROM transactions
                WHERE created_at >= ${since14} AND created_at < ${since7}
            `,
            sql`
                SELECT COUNT(*)::int AS c FROM users WHERE created_at >= ${since7}
            `,
            sql`
                SELECT COUNT(*)::int AS c FROM users
                WHERE created_at >= ${since14} AND created_at < ${since7}
            `,
            sql`
                SELECT COALESCE(SUM(amount_fiat), 0)::float AS vol
                FROM transactions
                WHERE type = 'SELL' AND status = 'COMPLETED' AND created_at >= ${since7}
            `,
            sql`
                SELECT COALESCE(SUM(amount_fiat), 0)::float AS vol
                FROM transactions
                WHERE type = 'SELL' AND status = 'COMPLETED'
                  AND created_at >= ${since14} AND created_at < ${since7}
            `,
            sql`SELECT coalesce(kyc_tier, 'none') AS tier, COUNT(*)::int AS c FROM users GROUP BY coalesce(kyc_tier, 'none')`,
            sql`SELECT COUNT(*)::int AS c FROM compliance_alerts WHERE resolved = false`,
        ]);

        const userCount = (userCountRow[0] as { c: number }).c;
        const txCount = (txCountRow[0] as { c: number }).c;
        const failedCount = (failedCountRow[0] as { c: number }).c;
        const newUsersToday = (newUsersRow[0] as { c: number }).c;
        const pendingCount = (pendingCountRow[0] as { c: number }).c;
        const merchantCount = (merchantCountRow[0] as { c: number })?.c ?? 0;

        const todayBuyVolume = (todayBuy as { amount_fiat?: number }[]).reduce((s, t) => s + (t.amount_fiat ?? 0), 0);
        const todaySellVolume = (todaySell as { amount_fiat?: number }[]).reduce((s, t) => s + (t.amount_fiat ?? 0), 0);

        const pctChange = (curr: number, prev: number) => {
            if (prev <= 0) return curr > 0 ? 100 : 0;
            return Math.round(((curr - prev) / prev) * 1000) / 10;
        };

        const weekVol = Number((weekVolumeRow[0] as { vol: number })?.vol ?? 0);
        const priorWeekVol = Number((priorWeekVolumeRow[0] as { vol: number })?.vol ?? 0);
        const weekTx = Number((weekTxRow[0] as { c: number })?.c ?? 0);
        const priorWeekTx = Number((priorWeekTxRow[0] as { c: number })?.c ?? 0);
        const weekUsers = Number((weekUsersRow[0] as { c: number })?.c ?? 0);
        const priorWeekUsers = Number((priorWeekUsersRow[0] as { c: number })?.c ?? 0);
        const weekPayouts = Number((weekPayoutsRow[0] as { vol: number })?.vol ?? 0);
        const priorWeekPayouts = Number((priorWeekPayoutsRow[0] as { vol: number })?.vol ?? 0);
        const usdcVolume7d = Number((usdcVolumeRow[0] as { vol: number })?.vol ?? 0);

        let kycVerified = 0;
        let kycPending = 0;
        let kycRejected = 0;
        for (const row of kycRows as unknown as Array<{ tier: string; c: number }>) {
            const t = String(row.tier || '').toLowerCase();
            if (t === 'verified' || t === 'enhanced' || t === 'full') kycVerified += row.c;
            else if (t === 'rejected' || t === 'reject' || t === 'blocked') kycRejected += row.c;
            else kycPending += row.c; // basic / none / pending
        }

        const healthData = await getAdminHealth();

        let liquidity: {
            lencoFloat: number | null;
            pendingPayoutZmw: number;
            platformXlm: string;
            platformUsdc: string;
            floatOk: boolean;
        } | null = null;

        if (canRunOps(ctx.role)) {
            try {
                const t = await getTreasurySnapshot();
                liquidity = {
                    lencoFloat: t.lencoFloat,
                    pendingPayoutZmw: t.pendingPayoutZmw,
                    platformXlm: t.platformXlm,
                    platformUsdc: t.platformUsdc,
                    floatOk: t.lencoFloat == null || t.lencoFloat >= t.pendingPayoutZmw,
                };
            } catch {
                liquidity = null;
            }
        }

        return NextResponse.json({
            users: userCount ?? 0,
            transactions: txCount ?? 0,
            pendingCount: pendingCount ?? 0,
            stuckCount: stuck.length,
            failedCount: failedCount ?? 0,
            newUsersToday: newUsersToday ?? 0,
            merchants: merchantCount,
            pending: pendingTxs,
            recent: recentTxs,
            todayBuyVolume,
            todaySellVolume,
            todayVolume: todayBuyVolume + todaySellVolume,
            health: healthData.env,
            probes: healthData.probes,
            adminRole: ctx.role,
            liquidity,
            unresolvedAlerts: (unresolvedAlertsRow[0] as { c: number })?.c ?? 0,
            trends: {
                volumeUsdc7d: usdcVolume7d,
                volumeZmw7d: weekVol,
                volumeChangePct: pctChange(weekVol, priorWeekVol),
                tx7d: weekTx,
                txChangePct: pctChange(weekTx, priorWeekTx),
                usersChangePct: pctChange(weekUsers, priorWeekUsers),
                merchantsChangePct: 0,
                payoutsZmw7d: weekPayouts,
                payoutsChangePct: pctChange(weekPayouts, priorWeekPayouts),
            },
            kyc: {
                verified: kycVerified,
                pending: kycPending,
                rejected: kycRejected,
            },
        });
    } catch (err) {
        console.error('Admin stats:', err);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
