'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
    Settings,
    Users,
    History,
    ArrowUpRight,
    ArrowDownLeft,
    RefreshCw,
    AlertCircle,
    UserPlus,
} from 'lucide-react';
import {
    AdminBadge,
    AdminErrorBanner,
    AdminLoading,
    AdminPageHeader,
    AdminStatCard,
    admin,
    txStatusTone,
} from '@/components/admin/admin-ui';

function formatAdminCrypto(amount: number, asset: string): string {
    const n = Number(amount) || 0;
    if (asset === 'usdc') return n.toFixed(2);
    if (n >= 1) return parseFloat(n.toFixed(4)).toString();
    if (n >= 0.0001) return parseFloat(n.toFixed(6)).toString();
    return n.toFixed(7);
}

type TxRow = {
    id: string;
    type: string;
    reference: string;
    amount_fiat: number;
    amount_xlm: number;
    status: string;
    created_at: string;
    asset?: string;
};

type Stats = {
    users: number;
    transactions: number;
    pendingCount: number;
    failedCount: number;
    newUsersToday: number;
    pending: TxRow[];
    recent: TxRow[];
    todayVolume: number;
    todayBuyVolume: number;
    todaySellVolume: number;
    health: { auth: boolean; smtp: boolean; encryption: boolean; lenco: boolean };
};

export default function AdminPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(() => {
        setLoading(true);
        setError('');
        fetch('/api/admin/stats')
            .then((res) => {
                if (!res.ok) throw new Error('Could not load dashboard');
                return res.json();
            })
            .then((data) => setStats(data))
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (loading && !stats) return <AdminLoading />;

    return (
        <div className="space-y-6 lg:space-y-8">
            <AdminPageHeader
                title="Dashboard"
                subtitle="Platform overview and operational health"
                action={
                    <button type="button" onClick={load} disabled={loading} className={admin.btnSecondary}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                }
            />

            {error && <AdminErrorBanner message={error} />}

            {stats?.health && (
                <div className={`${admin.card} p-4`}>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">System health</p>
                    <div className="flex flex-wrap gap-2">
                        {(
                            [
                                ['Auth', stats.health.auth],
                                ['Email', stats.health.smtp],
                                ['Wallet encryption', stats.health.encryption],
                                ['Lenco MoMo', stats.health.lenco],
                            ] as const
                        ).map(([label, ok]) => (
                            <AdminBadge key={label} tone={ok ? 'success' : 'danger'}>
                                {label}: {ok ? 'OK' : 'Missing'}
                            </AdminBadge>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <AdminStatCard
                    label="Total users"
                    value={stats?.users ?? 0}
                    hint={`+${stats?.newUsersToday ?? 0} today`}
                    href="/admin/users"
                    icon={Users}
                />
                <AdminStatCard
                    label="Transactions"
                    value={stats?.transactions ?? 0}
                    href="/admin/transactions"
                    icon={History}
                />
                <AdminStatCard
                    label="Pending"
                    value={stats?.pendingCount ?? 0}
                    hint="Awaiting payment or crediting"
                    href="/admin/transactions?status=PENDING"
                    icon={History}
                    tone="warning"
                />
                <AdminStatCard
                    label="Failed"
                    value={stats?.failedCount ?? 0}
                    hint="Review failed deposits and payouts"
                    href="/admin/transactions?status=FAILED"
                    icon={AlertCircle}
                    tone={stats?.failedCount ? 'danger' : 'default'}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className={admin.card}>
                    <div className={`${admin.cardHeader} flex items-center justify-between`}>
                        <h2 className="text-lg font-semibold text-slate-900">Today&apos;s volume</h2>
                        <AdminBadge tone="info">ZMW</AdminBadge>
                    </div>
                    <div className="p-5">
                        <p className="text-3xl font-bold text-slate-900 tabular-nums">
                            {(stats?.todayVolume ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                            Buy {(stats?.todayBuyVolume ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ·
                            Sell {(stats?.todaySellVolume ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
                <AdminStatCard
                    label="New signups today"
                    value={stats?.newUsersToday ?? 0}
                    hint="Email-verified accounts created today"
                    icon={UserPlus}
                />
            </div>

            <div className={admin.card}>
                <div className={`${admin.cardHeader} flex items-center justify-between`}>
                    <h2 className="text-lg font-semibold text-slate-900">Pending transactions</h2>
                    <Link href="/admin/transactions?status=PENDING" className="text-sm font-medium text-[var(--brand-accent)]">
                        View all →
                    </Link>
                </div>
                <div className="divide-y divide-slate-100">
                    {stats?.pending?.length ? (
                        stats.pending.slice(0, 5).map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div
                                        className={`rounded-lg p-2 ${tx.type === 'BUY' ? 'bg-emerald-100' : 'bg-slate-100'}`}
                                    >
                                        {tx.type === 'BUY' ? (
                                            <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                                        ) : (
                                            <ArrowUpRight className="h-4 w-4 text-slate-600" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-slate-800">
                                            {tx.type}{' '}
                                            {formatAdminCrypto(Number(tx.amount_xlm), tx.asset || 'xlm')}{' '}
                                            {(tx.asset || 'xlm').toUpperCase()}
                                        </p>
                                        <p className="truncate text-xs text-slate-500">
                                            {tx.reference} · {new Date(tx.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <AdminBadge tone={txStatusTone(tx.status)}>{tx.status}</AdminBadge>
                            </div>
                        ))
                    ) : (
                        <div className="px-6 py-8 text-center text-sm text-slate-500">No pending transactions</div>
                    )}
                </div>
            </div>

            <div className={admin.card}>
                <div className={`${admin.cardHeader} flex items-center justify-between`}>
                    <h2 className="text-lg font-semibold text-slate-900">Recent activity</h2>
                    <Link href="/admin/transactions" className="text-sm font-medium text-[var(--brand-accent)]">
                        View all →
                    </Link>
                </div>
                <div className="divide-y divide-slate-100">
                    {stats?.recent?.length ? (
                        stats.recent.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-800">
                                        {tx.type} · ZMW {Number(tx.amount_fiat).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleString()}</p>
                                </div>
                                <AdminBadge tone={txStatusTone(tx.status)}>{tx.status}</AdminBadge>
                            </div>
                        ))
                    ) : (
                        <div className="px-6 py-8 text-center text-sm text-slate-500">No transactions yet</div>
                    )}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Link
                    href="/admin/settings"
                    className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[var(--brand-accent-border)] hover:shadow-md"
                >
                    <div className="rounded-xl bg-[var(--brand-accent-muted)] p-3">
                        <Settings className="h-6 w-6 text-[var(--brand-accent)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">Fees & rates</p>
                        <p className="text-sm text-slate-500">XLM/USDC rates, limits, and fee percentages</p>
                    </div>
                </Link>
                <Link
                    href="/admin/compliance"
                    className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                    <div className="rounded-xl bg-slate-100 p-3">
                        <AlertCircle className="h-6 w-6 text-slate-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">Compliance</p>
                        <p className="text-sm text-slate-500">Alerts, KYC tiers, and monitoring</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
