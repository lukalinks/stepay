import { sql } from '@/lib/db';
import { PLATFORM_WALLET_PUBLIC } from '@/lib/constants';
import { probeLencoAuth } from '@/lib/lenco-config';
import { getLencoAvailableFloat } from '@/lib/liquidity';
import { StellarService } from '@/lib/stellar';

export async function getTreasurySnapshot(): Promise<{
    lencoFloat: number | null;
    lencoOk: boolean;
    platformXlm: string;
    platformUsdc: string;
    pendingPayoutZmw: number;
    pendingPayoutCount: number;
    todayCollectionsZmw: number;
    todayPayoutsZmw: number;
    netTodayZmw: number;
}> {
    const today = new Date().toISOString().slice(0, 10);

    const [xlm, usdc, pendingRows, todayBuy, todaySell, lencoAuth, lencoFloat] = await Promise.all([
        StellarService.getBalance(PLATFORM_WALLET_PUBLIC),
        StellarService.getUSDCBalance(PLATFORM_WALLET_PUBLIC),
        sql`
            SELECT amount_fiat FROM transactions
            WHERE type = 'SELL' AND status IN ('PENDING', 'PROCESSING', 'PAYOUT_FAILED')
        `,
        sql`
            SELECT amount_fiat FROM transactions
            WHERE type = 'BUY' AND status = 'COMPLETED' AND created_at >= ${`${today}T00:00:00`}
        `,
        sql`
            SELECT amount_fiat FROM transactions
            WHERE type = 'SELL' AND status = 'COMPLETED' AND created_at >= ${`${today}T00:00:00`}
        `,
        probeLencoAuth(),
        getLencoAvailableFloat(),
    ]);

    const pending = pendingRows as { amount_fiat?: number }[];
    const pendingPayoutZmw = pending.reduce((s, r) => s + (Number(r.amount_fiat) || 0), 0);
    const todayCollectionsZmw = (todayBuy as { amount_fiat?: number }[]).reduce(
        (s, r) => s + (Number(r.amount_fiat) || 0),
        0
    );
    const todayPayoutsZmw = (todaySell as { amount_fiat?: number }[]).reduce(
        (s, r) => s + (Number(r.amount_fiat) || 0),
        0
    );

    return {
        lencoFloat,
        lencoOk: lencoAuth.ok,
        platformXlm: xlm,
        platformUsdc: usdc,
        pendingPayoutZmw,
        pendingPayoutCount: pending.length,
        todayCollectionsZmw,
        todayPayoutsZmw,
        netTodayZmw: todayCollectionsZmw - todayPayoutsZmw,
    };
}
