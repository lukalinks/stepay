'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useMarketRates } from '@/components/market/useMarketRates';
import { ComingSoonCashPanel } from '@/components/market/ComingSoonCashPanel';
import { AnchorCashPanel } from '@/components/market/AnchorCashPanel';
import { dash } from '@/lib/dashboard-ui';

type Rail = 'mobile_money' | 'stellar_anchor';

/** Routes Buy/Sell UI by market rail: Lenco MM, MoneyGram, both (picker), or coming soon. */
export function CashRailRouter({
    kind,
    mobileMoney,
}: {
    kind: 'deposit' | 'withdraw';
    mobileMoney: ReactNode;
}) {
    const { market, hasMobileMoney, hasStellarAnchor } = useMarketRates();
    const both = hasMobileMoney && hasStellarAnchor;
    const [rail, setRail] = useState<Rail>(() =>
        hasMobileMoney ? 'mobile_money' : 'stellar_anchor'
    );

    useEffect(() => {
        if (both) return;
        if (hasMobileMoney) setRail('mobile_money');
        else if (hasStellarAnchor) setRail('stellar_anchor');
    }, [both, hasMobileMoney, hasStellarAnchor]);

    if (!hasMobileMoney && !hasStellarAnchor) {
        return <ComingSoonCashPanel market={market} kind={kind} />;
    }

    const active: Rail = both ? rail : hasMobileMoney ? 'mobile_money' : 'stellar_anchor';

    return (
        <div className="space-y-4">
            {both && (
                <div className="space-y-2">
                    <p className={dash.sectionLabel}>Cash method</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setRail('mobile_money')}
                            className={`min-h-[44px] rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                                active === 'mobile_money'
                                    ? 'border-[var(--brand-accent-border)] bg-[var(--brand-accent-subtle)] text-[var(--brand-accent)]'
                                    : 'border-white/[0.08] bg-white/[0.03] text-white/70 hover:border-white/[0.14]'
                            }`}
                        >
                            Mobile money
                        </button>
                        <button
                            type="button"
                            onClick={() => setRail('stellar_anchor')}
                            className={`min-h-[44px] rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                                active === 'stellar_anchor'
                                    ? 'border-[var(--brand-accent-border)] bg-[var(--brand-accent-subtle)] text-[var(--brand-accent)]'
                                    : 'border-white/[0.08] bg-white/[0.03] text-white/70 hover:border-white/[0.14]'
                            }`}
                        >
                            {market.anchor?.partnerName || 'MoneyGram'}
                        </button>
                    </div>
                    <p className={dash.hint}>
                        {active === 'mobile_money'
                            ? `Receive ${market.currency} on your phone`
                            : 'Pick up cash at a MoneyGram agent (USDC)'}
                    </p>
                </div>
            )}

            {active === 'mobile_money' ? mobileMoney : <AnchorCashPanel market={market} kind={kind} />}
        </div>
    );
}
