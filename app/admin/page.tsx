'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Bell,
    History,
    RefreshCw,
    Store,
    Users,
} from 'lucide-react';
import {
    AdminErrorBanner,
    AdminKpiCard,
    AdminLoading,
    TxStatusBadge,
    admin,
    formatTxType,
} from '@/components/admin/admin-ui';
import { KycGauge, TransactionDonut, VolumeAreaChart } from '@/components/admin/VolumeChart';

function formatAdminCrypto(amount: number, asset: string): string {
    const n = Number(amount) || 0;
    if (asset === 'usdc') return n.toFixed(2);
    if (n >= 1) return parseFloat(n.toFixed(4)).toString();
    if (n >= 0.0001) return parseFloat(n.toFixed(6)).toString();
    return n.toFixed(7);
}

function formatMoney(n: number, prefix = '') {
    return `${prefix}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function relativeTime(iso: string) {
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
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
    user_email?: string | null;
    user_name?: string | null;
};

type Stats = {
    users: number;
    transactions: number;
    pendingCount: number;
    stuckCount?: number;
    failedCount: number;
    newUsersToday: number;
    merchants?: number;
    pending: TxRow[];
    recent: TxRow[];
    todayVolume: number;
    todayBuyVolume: number;
    todaySellVolume: number;
    health: { auth: boolean; smtp: boolean; encryption: boolean; lenco: boolean };
    probes?: Array<{ ok: boolean; label: string; detail?: string; checkedAt: string }>;
    adminRole?: string;
    unresolvedAlerts?: number;
    liquidity?: {
        lencoFloat: number | null;
        pendingPayoutZmw: number;
        platformXlm: string;
        platformUsdc: string;
        floatOk: boolean;
    } | null;
    trends?: {
        volumeUsdc7d: number;
        volumeZmw7d: number;
        volumeChangePct: number;
        tx7d: number;
        txChangePct: number;
        usersChangePct: number;
        merchantsChangePct: number;
        payoutsZmw7d: number;
        payoutsChangePct: number;
    };
    kyc?: { verified: number; pending: number; rejected: number };
};

type Analytics = {
    days: number;
    dailyVolume: { day: string; buyZmw: number; sellZmw: number; txCount?: number }[];
    typeBreakdown: { type: string; c: number }[];
    failedRatePct: number;
    totalTx: number;
};

const TYPE_COLORS: Record<string, string> = {
    BUY: '#059669',
    SELL: '#C9A962',
    SEND: '#3B82F6',
    SWAP: '#7C3AED',
    DEPOSIT: '#10B981',
    WITHDRAW: '#E11D48',
};

function txParty(tx: TxRow) {
    return tx.user_name || tx.user_email || tx.reference || 'User';
}

function isCredit(type: string) {
    return type === 'BUY' || type === 'DEPOSIT';
}

export default function AdminPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [days, setDays] = useState(7);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(() => {
        setLoading(true);
        setError('');
        Promise.all([
            fetch('/api/admin/stats').then((res) => {
                if (!res.ok) throw new Error('Could not load dashboard');
                return res.json();
            }),
            fetch(`/api/admin/analytics?days=${days}`).then((res) => (res.ok ? res.json() : null)),
        ])
            .then(([statsData, analyticsData]) => {
                setStats(statsData);
                setAnalytics(analyticsData);
            })
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
            .finally(() => setLoading(false));
    }, [days]);

    useEffect(() => {
        load();
    }, [load]);

    const dateRangeLabel = useMemo(() => {
        const end = new Date();
        const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
        const fmt = (d: Date) =>
            d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return `${fmt(start)} – ${fmt(end)}`;
    }, [days]);

    const donutSlices = useMemo(() => {
        const rows = analytics?.typeBreakdown || [];
        return rows.map((r) => ({
            label: formatTxType(r.type),
            value: Number(r.c) || 0,
            color: TYPE_COLORS[r.type] || '#94A3B8',
        }));
    }, [analytics]);

    const systemsOk =
        !!stats?.health &&
        stats.health.auth &&
        stats.health.smtp &&
        stats.health.encryption &&
        (stats.probes ? stats.probes.every((p) => p.ok) : true);

    if (loading && !stats) return <AdminLoading />;

    const trends = stats?.trends;
    const kyc = stats?.kyc || { verified: 0, pending: 0, rejected: 0 };

    return (
        <div className="space-y-6 lg:space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Platform
                    </p>
                    <h1 className={admin.pageTitle}>Dashboard</h1>
                    <p className={admin.pageSubtitle}>Live overview of Stepay performance and health.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className={admin.select}
                        aria-label="Date range"
                    >
                        <option value={7}>{dateRangeLabel} · 7d</option>
                        <option value={14}>Last 14 days</option>
                        <option value={30}>Last 30 days</option>
                    </select>
                    <Link href="/admin/compliance" className={`relative ${admin.iconBtn}`} aria-label="Notifications">
                        <Bell className="h-4 w-4" strokeWidth={1.75} />
                        {(stats?.unresolvedAlerts || 0) > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[var(--brand-accent)] px-1 text-[9px] font-bold text-[var(--brand-accent-contrast)]">
                                {Math.min(stats?.unresolvedAlerts || 0, 99)}
                            </span>
                        )}
                    </Link>
                    <button type="button" onClick={load} disabled={loading} className={admin.btnSecondary} aria-label="Refresh">
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                        Refresh
                    </button>
                </div>
            </div>

            {error && <AdminErrorBanner message={error} />}

            <div className="grid gap-3 sm:grid-cols-3">
                <AdminKpiCard
                    label="Transactions"
                    value={(stats?.transactions ?? 0).toLocaleString()}
                    changePct={trends?.txChangePct}
                    icon={History}
                    iconClassName="bg-sky-50/80 text-sky-700"
                    href="/admin/transactions"
                />
                <AdminKpiCard
                    label="Users"
                    value={(stats?.users ?? 0).toLocaleString()}
                    changePct={trends?.usersChangePct}
                    icon={Users}
                    iconClassName="bg-violet-50/80 text-violet-700"
                    href="/admin/users"
                />
                <AdminKpiCard
                    label="Merchants"
                    value={(stats?.merchants ?? 0).toLocaleString()}
                    changePct={trends?.merchantsChangePct}
                    icon={Store}
                    iconClassName="bg-[var(--brand-accent-muted)] text-[#8B7344]"
                    href="/admin/merchants"
                />
            </div>

            <div className="grid gap-3 xl:grid-cols-12">
                <div className={`${admin.card} p-5 xl:col-span-5`}>
                    <VolumeAreaChart data={analytics?.dailyVolume || []} rangeLabel={`${days} Days`} />
                </div>
                <div className={`${admin.card} p-5 xl:col-span-4`}>
                    <TransactionDonut slices={donutSlices} total={analytics?.totalTx ?? stats?.transactions ?? 0} />
                </div>
                <div className={`${admin.card} xl:col-span-3`}>
                    <div className="flex items-center justify-between px-5 py-4">
                        <h3 className="text-sm font-semibold tracking-tight text-slate-900">Live activity</h3>
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                    </div>
                    <div className="max-h-[300px] divide-y divide-slate-100/80 overflow-y-auto">
                        {(stats?.recent || []).slice(0, 6).map((tx) => {
                            const credit = isCredit(tx.type);
                            const amt = Number(tx.amount_fiat) || Number(tx.amount_xlm) || 0;
                            return (
                                <div key={tx.id} className="flex items-start gap-3 px-4 py-3.5 transition hover:bg-slate-50/70">
                                    <div
                                        className={`mt-0.5 rounded-xl p-2 ring-1 ring-inset ${
                                            credit
                                                ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
                                                : 'bg-rose-50 text-rose-600 ring-rose-100'
                                        }`}
                                    >
                                        {credit ? (
                                            <ArrowDownLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                                        ) : (
                                            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-semibold text-slate-800">{txParty(tx)}</p>
                                        <p className="truncate text-[11px] text-slate-450 text-slate-500">
                                            {formatTxType(tx.type)} · {formatAdminCrypto(Number(tx.amount_xlm), tx.asset || 'xlm')}{' '}
                                            {(tx.asset || 'xlm').toUpperCase()}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p
                                            className={`text-[13px] font-semibold tabular-nums ${
                                                credit ? 'text-emerald-600' : 'text-rose-600'
                                            }`}
                                        >
                                            {credit ? '+' : '−'}
                                            {amt >= 1 ? formatMoney(amt) : amt.toFixed(4)}
                                        </p>
                                        <p className="text-[10px] text-slate-400">{relativeTime(tx.created_at)}</p>
                                    </div>
                                </div>
                            );
                        })}
                        {!stats?.recent?.length && (
                            <p className="px-5 py-10 text-center text-sm text-slate-500">No recent activity</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-12">
                <div className={`${admin.card} xl:col-span-7`}>
                    <div className="flex items-center justify-between px-5 py-4">
                        <h3 className="text-sm font-semibold tracking-tight text-slate-900">Recent transactions</h3>
                        <Link
                            href="/admin/transactions"
                            className="text-[12px] font-semibold text-[#8B7344] transition hover:text-[var(--brand-accent)]"
                        >
                            View all →
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="border-y border-slate-100 text-[11px] uppercase tracking-[0.08em] text-slate-400">
                                    <th className="px-5 py-3 font-medium">ID</th>
                                    <th className="px-4 py-3 font-medium">User</th>
                                    <th className="px-4 py-3 font-medium">Type</th>
                                    <th className="px-4 py-3 font-medium">Amount</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-5 py-3 font-medium">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(stats?.recent || []).slice(0, 8).map((tx) => (
                                    <tr
                                        key={tx.id}
                                        className="border-b border-slate-50 transition last:border-0 hover:bg-slate-50/60"
                                    >
                                        <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400">
                                            {tx.id.slice(0, 8)}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-accent-muted)] text-[10px] font-semibold text-[#8B7344]">
                                                    {txParty(tx).slice(0, 2).toUpperCase()}
                                                </span>
                                                <span className="max-w-[140px] truncate text-[13px] font-medium text-slate-800">
                                                    {txParty(tx)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-100">
                                                {formatTxType(tx.type)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-[13px] font-semibold tabular-nums text-slate-800">
                                            {formatMoney(Number(tx.amount_fiat) || 0)}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <TxStatusBadge status={tx.status} type={tx.type} asset={tx.asset} />
                                        </td>
                                        <td className="px-5 py-3.5 text-[11px] text-slate-400">
                                            {relativeTime(tx.created_at)}
                                        </td>
                                    </tr>
                                ))}
                                {!stats?.recent?.length && (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                                            No transactions yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className={`${admin.card} p-5 xl:col-span-2`}>
                    <KycGauge verified={kyc.verified} pending={kyc.pending} rejected={kyc.rejected} />
                </div>

                <div className={`${admin.card} xl:col-span-3`}>
                    <div className="px-5 py-4">
                        <h3 className="text-sm font-semibold tracking-tight text-slate-900">Treasury</h3>
                        <p className="mt-0.5 text-[11px] text-slate-400">On-platform balances</p>
                    </div>
                    <div className="space-y-1 px-3 pb-4">
                        {[
                            {
                                label: 'Platform USDC',
                                value:
                                    stats?.liquidity?.platformUsdc != null
                                        ? `$${Number(stats.liquidity.platformUsdc).toLocaleString(undefined, {
                                              minimumFractionDigits: 2,
                                          })}`
                                        : '—',
                            },
                            {
                                label: 'Pending payouts',
                                value: stats?.liquidity
                                    ? `ZMW ${formatMoney(stats.liquidity.pendingPayoutZmw)}`
                                    : '—',
                            },
                            {
                                label: 'Lenco float',
                                value:
                                    stats?.liquidity?.lencoFloat == null
                                        ? '—'
                                        : `ZMW ${formatMoney(stats.liquidity.lencoFloat)}`,
                                warn: stats?.liquidity && !stats.liquidity.floatOk,
                            },
                            {
                                label: 'Platform XLM',
                                value: stats?.liquidity?.platformXlm ?? '—',
                            },
                        ].map((row) => (
                            <div
                                key={row.label}
                                className="flex items-center justify-between rounded-xl px-2.5 py-2.5 text-[13px] hover:bg-slate-50/80"
                            >
                                <span className="text-slate-500">{row.label}</span>
                                <span
                                    className={`font-semibold tabular-nums ${
                                        row.warn ? 'text-rose-600' : 'text-slate-900'
                                    }`}
                                >
                                    {row.value}
                                </span>
                            </div>
                        ))}
                        <div className="px-2.5 pt-2">
                            <Link
                                href="/admin/treasury"
                                className="text-[12px] font-semibold text-[#8B7344] transition hover:text-[var(--brand-accent)]"
                            >
                                Open treasury →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    {[
                        { label: 'Pending', value: stats?.pendingCount ?? 0 },
                        { label: 'Recovery', value: stats?.stuckCount ?? 0 },
                        { label: 'Failed', value: stats?.failedCount ?? 0 },
                        { label: 'Signups today', value: stats?.newUsersToday ?? 0 },
                    ].map((chip) => (
                        <span
                            key={chip.label}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200/70"
                        >
                            <span className="text-slate-400">{chip.label}</span>
                            <span className="font-semibold tabular-nums text-slate-800">{chip.value}</span>
                        </span>
                    ))}
                </div>
                <p
                    className={`flex items-center gap-2 text-[13px] font-medium ${
                        systemsOk ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                >
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${systemsOk ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    />
                    {systemsOk ? 'All systems operational' : 'Some systems need attention'}
                </p>
            </div>
        </div>
    );
}
