'use client';

import { dash } from '@/lib/dashboard-ui';
import type { MarketConfig } from '@/lib/markets';

export function ComingSoonCashPanel({
    market,
    kind,
}: {
    market: MarketConfig;
    kind: 'deposit' | 'withdraw';
}) {
    const action = kind === 'deposit' ? 'Cash in' : 'Cash out';
    return (
        <div className={`${dash.panelInset} p-6 text-center space-y-2`}>
            <p className="text-3xl" aria-hidden>
                {market.flagEmoji}
            </p>
            <h2 className="text-base font-semibold text-white">
                {action} — coming soon
            </h2>
        </div>
    );
}
