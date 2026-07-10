'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { AssetIcon } from '@/components/AssetIcon';
import { assetDisplayLabel } from '@/lib/assets';
import { dash } from '@/lib/dashboard-ui';

export default function RatesPage() {
    const [data, setData] = useState<{
        rates?: { xlm: { buy: number; sell: number }; usdc: { buy: number; sell: number } };
        fees?: { buyPercent: number; sellPercent: number };
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/rates')
            .then((res) => (res.ok ? res.json() : null))
            .then(setData)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <Loader2 className={dash.spinner} />
            </div>
        );
    }

    const rates = data?.rates;
    const fees = data?.fees;

    return (
        <DashboardCard title="Exchange rates" subtitle="Prices in local currency per unit of crypto" noPadding>
            {rates ? (
                <div className="divide-y divide-white/[0.06]">
                    {(['xlm', 'usdc'] as const).map((asset) => (
                        <div key={asset} className="px-3.5 py-4 sm:px-6 sm:py-5">
                            <div className="mb-3 flex items-center gap-3">
                                <AssetIcon asset={asset} size="sm" />
                                <span className="text-sm font-bold uppercase text-white">{assetDisplayLabel(asset)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
                                <div>
                                    <p className={dash.sectionLabel}>Buy</p>
                                    <p className="mt-1 text-lg font-bold tabular-nums text-[var(--brand-accent)]">
                                        {rates[asset].buy.toFixed(2)}
                                        <span className="ml-1 text-sm font-medium text-white/40">local</span>
                                    </p>
                                </div>
                                <div>
                                    <p className={dash.sectionLabel}>Sell</p>
                                    <p className="mt-1 text-lg font-bold tabular-nums text-white">
                                        {rates[asset].sell.toFixed(2)}
                                        <span className="ml-1 text-sm font-medium text-white/40">local</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {fees && (
                        <div className="px-5 py-4 text-sm text-white/40 sm:px-6">
                            Fees: {fees.buyPercent}% on deposits · {fees.sellPercent}% on cash outs
                        </div>
                    )}
                </div>
            ) : (
                <p className="p-8 text-center text-white/45">Rates unavailable right now.</p>
            )}
        </DashboardCard>
    );
}
