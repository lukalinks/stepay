'use client';

import { useEffect, useState } from 'react';
import { KeyRound, RefreshCw, ShoppingBag, Store, Webhook } from 'lucide-react';
import {
    AdminBadge,
    AdminEmptyState,
    AdminErrorBanner,
    AdminLoading,
    AdminPageHeader,
    admin,
    adminTable,
} from '@/components/admin/admin-ui';

type MerchantData = {
    merchantCount: number;
    totalCheckouts: number;
    checkoutStats: { status: string; c: number }[];
    apiKeys: { total: number; active: number };
    checkouts: Array<{
        id: string;
        token: string;
        amount: number;
        asset: string;
        label: string;
        status: string;
        createdAt: string;
        paidAt: string | null;
        merchantEmail: string;
    }>;
    failedWebhooks: Array<{
        id: string;
        eventType: string;
        responseStatus: number | null;
        deliveredAt: string;
        checkoutLabel: string;
        merchantEmail: string;
    }>;
};

function statusTone(s: string): 'success' | 'warning' | 'danger' | 'default' {
    if (s === 'paid') return 'success';
    if (s === 'pending') return 'warning';
    if (s === 'expired' || s === 'cancelled') return 'danger';
    return 'default';
}

function relativeTime(iso: string) {
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AdminMerchantsPage() {
    const [data, setData] = useState<MerchantData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = () => {
        setLoading(true);
        fetch('/api/admin/merchants')
            .then((r) => {
                if (!r.ok) throw new Error('Could not load merchants');
                return r.json();
            })
            .then(setData)
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, []);

    return (
        <div className="space-y-6 lg:space-y-8">
            <AdminPageHeader
                eyebrow="Partners"
                title="Merchants"
                subtitle="Partner API checkouts, keys, and webhook delivery"
                action={
                    <button type="button" onClick={load} disabled={loading} className={admin.btnSecondary}>
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                        Refresh
                    </button>
                }
            />

            {error && <AdminErrorBanner message={error} />}

            <div className="grid gap-3 sm:grid-cols-3">
                <div className={`${admin.card} p-3.5`}>
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-medium text-slate-500">Merchants</p>
                        <div className="rounded-lg bg-[var(--brand-accent-muted)] p-1.5 text-[#8B7344] ring-1 ring-inset ring-black/[0.03]">
                            <Store className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                        {(data?.merchantCount ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">With checkouts</p>
                </div>
                <div className={`${admin.card} p-3.5`}>
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-medium text-slate-500">Checkouts</p>
                        <div className="rounded-lg bg-sky-50/80 p-1.5 text-sky-700 ring-1 ring-inset ring-black/[0.03]">
                            <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                        {(data?.totalCheckouts ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">All time</p>
                </div>
                <div className={`${admin.card} p-3.5`}>
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-medium text-slate-500">API keys</p>
                        <div className="rounded-lg bg-violet-50/80 p-1.5 text-violet-700 ring-1 ring-inset ring-black/[0.03]">
                            <KeyRound className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                        {data?.apiKeys?.active ?? 0}
                        <span className="text-base font-medium text-slate-400"> / {data?.apiKeys?.total ?? 0}</span>
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">Active / total</p>
                </div>
            </div>

            {data?.checkoutStats && data.checkoutStats.length > 0 && (
                <div className={`${admin.card} flex flex-wrap gap-2 px-5 py-4`}>
                    {data.checkoutStats.map((s) => (
                        <AdminBadge key={s.status} tone={statusTone(s.status)}>
                            {s.status}: {s.c}
                        </AdminBadge>
                    ))}
                </div>
            )}

            <div className={admin.card}>
                <div className="border-b border-slate-100/80 px-5 py-4">
                    <h2 className="text-sm font-semibold tracking-tight text-slate-900">Recent checkouts</h2>
                </div>
                {loading ? (
                    <AdminLoading />
                ) : !data?.checkouts.length ? (
                    <AdminEmptyState message="No merchant checkouts yet." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead>
                                <tr className={adminTable.head}>
                                    <th className={adminTable.th}>Merchant</th>
                                    <th className={adminTable.thTight}>Label</th>
                                    <th className={adminTable.thTight}>Amount</th>
                                    <th className={adminTable.thTight}>Status</th>
                                    <th className={adminTable.th}>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.checkouts.map((c) => (
                                    <tr key={c.id} className={adminTable.row}>
                                        <td className={`${adminTable.td} max-w-[160px] truncate text-[13px] font-medium text-slate-800`}>
                                            {c.merchantEmail}
                                        </td>
                                        <td className={`${adminTable.tdTight} text-[13px] text-slate-600`}>
                                            {c.label || '—'}
                                        </td>
                                        <td className={`${adminTable.tdTight} text-[13px] font-semibold tabular-nums text-slate-800`}>
                                            {c.amount} {c.asset.toUpperCase()}
                                        </td>
                                        <td className={adminTable.tdTight}>
                                            <AdminBadge tone={statusTone(c.status)}>{c.status}</AdminBadge>
                                        </td>
                                        <td
                                            className={`${adminTable.td} text-[12px] text-slate-500`}
                                            title={new Date(c.createdAt).toLocaleString()}
                                        >
                                            {relativeTime(c.createdAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {(data?.failedWebhooks?.length ?? 0) > 0 && (
                <div className={admin.card}>
                    <div className="flex items-center gap-2 border-b border-slate-100/80 px-5 py-4">
                        <div className="rounded-xl bg-rose-50/80 p-2 text-rose-700 ring-1 ring-inset ring-black/[0.03]">
                            <Webhook className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold tracking-tight text-slate-900">Failed webhooks</h2>
                            <p className="text-[11px] text-slate-400">{data!.failedWebhooks.length} delivery failures</p>
                        </div>
                    </div>
                    <ul className="divide-y divide-slate-50">
                        {data!.failedWebhooks.map((w) => (
                            <li key={w.id} className="px-5 py-3.5 transition hover:bg-slate-50/70">
                                <p className="text-[13px] font-semibold text-slate-800">
                                    {w.checkoutLabel} · {w.eventType}
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                    {w.merchantEmail} · HTTP {w.responseStatus ?? '—'} ·{' '}
                                    {new Date(w.deliveredAt).toLocaleString()}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
