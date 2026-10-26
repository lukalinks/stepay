'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Wallet, Banknote, ArrowLeftRight, Scale } from 'lucide-react';
import {
    AdminBadge,
    AdminErrorBanner,
    AdminKpiCard,
    AdminLoading,
    AdminPageHeader,
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

function formatMoney(n: number) {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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
        <div className="space-y-6 lg:space-y-8">
            <AdminPageHeader
                eyebrow="Liquidity"
                title="Treasury"
                subtitle="Mobile money float, platform wallet, and payout liability"
                action={
                    <button type="button" onClick={load} disabled={loading} className={admin.btnSecondary}>
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                        Refresh
                    </button>
                }
            />

            {error && <AdminErrorBanner message={error} />}

            {floatLow && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
                    Lenco float may be insufficient for pending payouts (
                    {data?.lencoFloat?.toLocaleString()} ZMW available vs{' '}
                    {data?.pendingPayoutZmw.toLocaleString()} ZMW pending).
                </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <AdminKpiCard
                    label="Lenco float"
                    value={data?.lencoFloat != null ? `${formatMoney(data.lencoFloat)} ZMW` : '—'}
                    icon={Banknote}
                    iconClassName={
                        floatLow
                            ? 'bg-amber-50/80 text-amber-700'
                            : 'bg-[var(--brand-accent-muted)] text-[#8B7344]'
                    }
                />
                <AdminKpiCard
                    label="Platform XLM"
                    value={data?.platformXlm ?? '—'}
                    icon={Wallet}
                    iconClassName="bg-sky-50/80 text-sky-700"
                />
                <AdminKpiCard
                    label="Platform USDC"
                    value={data?.platformUsdc ?? '—'}
                    icon={Wallet}
                    iconClassName="bg-emerald-50/80 text-emerald-700"
                />
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
                <div className={`${admin.card} p-3.5`}>
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-medium text-slate-500">Pending payout liability</p>
                        <div className="rounded-lg bg-rose-50/80 p-1.5 text-rose-700 ring-1 ring-inset ring-black/[0.03]">
                            <Scale className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                        {formatMoney(data?.pendingPayoutZmw ?? 0)} ZMW
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">
                        {data?.pendingPayoutCount ?? 0} payout transactions
                    </p>
                </div>
                <div className={`${admin.card} p-3.5`}>
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-medium text-slate-500">Today net (collections − payouts)</p>
                        <div className="rounded-lg bg-violet-50/80 p-1.5 text-violet-700 ring-1 ring-inset ring-black/[0.03]">
                            <ArrowLeftRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </div>
                    </div>
                    <p
                        className={`mt-2 text-xl font-semibold tabular-nums tracking-tight ${
                            (data?.netTodayZmw ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                    >
                        {formatMoney(data?.netTodayZmw ?? 0)} ZMW
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">
                        In {formatMoney(data?.todayCollectionsZmw ?? 0)} · Out{' '}
                        {formatMoney(data?.todayPayoutsZmw ?? 0)}
                    </p>
                </div>
            </div>

            <div className={`${admin.card} flex items-center gap-3 px-5 py-4`}>
                <AdminBadge tone={data?.lencoOk ? 'success' : 'danger'}>
                    Lenco {data?.lencoOk ? 'connected' : 'disconnected'}
                </AdminBadge>
                <p className="text-[11px] text-slate-400">
                    {data?.lencoOk ? 'API balance fetch succeeded' : 'Could not fetch Lenco balance'}
                </p>
            </div>
        </div>
    );
}
