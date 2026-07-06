'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Wallet, Banknote } from 'lucide-react';
import {
    AdminBadge,
    AdminErrorBanner,
    AdminLoading,
    AdminPageHeader,
    AdminStatCard,
    admin,
} from '@/components/admin/admin-ui';

type Treasury = {
    lencoFloat: number | null;
    lencoOk: boolean;
    platformXlm: string;
    platformUsdc: string;
    pendingPayoutZmw: number;
    pendingPayoutCount: number;
    todayCollectionsZmw: number;
    todayPayoutsZmw: number;
    netTodayZmw: number;
};

export default function AdminTreasuryPage() {
    const [data, setData] = useState<Treasury | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = () => {
        setLoading(true);
        setError('');
        fetch('/api/admin/treasury')
            .then((r) => {
                if (r.status === 403) throw new Error('Ops role required for treasury');
                if (!r.ok) throw new Error('Could not load treasury');
                return r.json();
            })
            .then(setData)
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, []);

    if (loading && !data) return <AdminLoading />;

    const floatLow = data?.lencoFloat != null && data.lencoFloat < data.pendingPayoutZmw;

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Treasury"
                subtitle="Mobile money float, platform wallet, and payout liability"
                action={
                    <button type="button" onClick={load} disabled={loading} className={admin.btnSecondary}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                }
            />

            {error && <AdminErrorBanner message={error} />}

            {floatLow && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Lenco float may be insufficient for pending payouts ({data?.lencoFloat?.toLocaleString()} ZMW available vs{' '}
                    {data?.pendingPayoutZmw.toLocaleString()} ZMW pending).
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <AdminStatCard
                    label="Lenco float"
                    value={data?.lencoFloat != null ? `${data.lencoFloat.toLocaleString()} ZMW` : '—'}
                    hint={data?.lencoOk ? 'API connected' : 'Could not fetch balance'}
                    icon={Banknote}
                    tone={floatLow ? 'warning' : 'default'}
                />
                <AdminStatCard
                    label="Platform XLM"
                    value={data?.platformXlm ?? '—'}
                    icon={Wallet}
                />
                <AdminStatCard
                    label="Platform USDC"
                    value={data?.platformUsdc ?? '—'}
                    icon={Wallet}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className={`${admin.card} p-5`}>
                    <p className="text-xs font-semibold uppercase text-slate-400">Pending payout liability</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                        {(data?.pendingPayoutZmw ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ZMW
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{data?.pendingPayoutCount ?? 0} SELL transactions</p>
                </div>
                <div className={`${admin.card} p-5`}>
                    <p className="text-xs font-semibold uppercase text-slate-400">Today net (collections − payouts)</p>
                    <p className={`mt-2 text-3xl font-bold tabular-nums ${(data?.netTodayZmw ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {(data?.netTodayZmw ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ZMW
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                        In {(data?.todayCollectionsZmw ?? 0).toLocaleString()} · Out {(data?.todayPayoutsZmw ?? 0).toLocaleString()}
                    </p>
                </div>
            </div>

            <div className={`${admin.card} p-4`}>
                <AdminBadge tone={data?.lencoOk ? 'success' : 'danger'}>
                    Lenco {data?.lencoOk ? 'connected' : 'disconnected'}
                </AdminBadge>
            </div>
        </div>
    );
}
