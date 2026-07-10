'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Store } from 'lucide-react';
import {
    AdminBadge,
    AdminEmptyState,
    AdminErrorBanner,
    AdminLoading,
    AdminPageHeader,
    admin,
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
        <div className="space-y-6">
            <AdminPageHeader
                title="Merchants"
                subtitle="Partner API checkouts, keys, and webhook delivery"
                action={
                    <button type="button" onClick={load} disabled={loading} className={admin.btnSecondary}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                }
            />

            {error && <AdminErrorBanner message={error} />}

            <div className="grid gap-4 sm:grid-cols-3">
                <div className={`${admin.card} p-4 flex items-center gap-3`}>
                    <Store className="h-8 w-8 text-[var(--brand-accent)]" />
                    <div>
                        <p className="text-xs text-slate-500">Merchants with checkouts</p>
                        <p className="text-2xl font-bold">{data?.merchantCount ?? 0}</p>
                    </div>
                </div>
                <div className={`${admin.card} p-4`}>
                    <p className="text-xs text-slate-500">Total checkouts</p>
                    <p className="text-2xl font-bold">{data?.totalCheckouts ?? 0}</p>
                </div>
                <div className={`${admin.card} p-4`}>
                    <p className="text-xs text-slate-500">API keys (active / total)</p>
                    <p className="text-2xl font-bold">
                        {data?.apiKeys?.active ?? 0} / {data?.apiKeys?.total ?? 0}
                    </p>
                </div>
            </div>

            {data?.checkoutStats && (
                <div className={`${admin.card} p-4 flex flex-wrap gap-2`}>
                    {data.checkoutStats.map((s) => (
                        <AdminBadge key={s.status} tone={statusTone(s.status)}>
                            {s.status}: {s.c}
                        </AdminBadge>
                    ))}
                </div>
            )}

            <div className={admin.card}>
                <div className={admin.cardHeader}>
                    <h2 className="font-semibold text-slate-800">Recent checkouts</h2>
                </div>
                {loading ? (
                    <AdminLoading />
                ) : !data?.checkouts.length ? (
                    <AdminEmptyState message="No merchant checkouts yet." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-sm">
                            <thead className="bg-slate-50/80 text-left">
                                <tr>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Merchant</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Label</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Amount</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.checkouts.map((c) => (
                                    <tr key={c.id}>
                                        <td className="px-5 py-3 truncate max-w-[140px]">{c.merchantEmail}</td>
                                        <td className="px-5 py-3">{c.label}</td>
                                        <td className="px-5 py-3 tabular-nums">
                                            {c.amount} {c.asset.toUpperCase()}
                                        </td>
                                        <td className="px-5 py-3">
                                            <AdminBadge tone={statusTone(c.status)}>{c.status}</AdminBadge>
                                        </td>
                                        <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                                            {new Date(c.createdAt).toLocaleString()}
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
                    <div className={admin.cardHeader}>
                        <h2 className="font-semibold text-red-800">Failed webhooks</h2>
                    </div>
                    <ul className="divide-y divide-slate-100">
                        {data!.failedWebhooks.map((w) => (
                            <li key={w.id} className="px-5 py-3 text-sm">
                                <p className="font-medium">{w.checkoutLabel} · {w.eventType}</p>
                                <p className="text-slate-500">
                                    {w.merchantEmail} · HTTP {w.responseStatus ?? '—'} · {new Date(w.deliveredAt).toLocaleString()}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
