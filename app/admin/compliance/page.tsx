'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, History, Phone, ShieldAlert } from 'lucide-react';
import {
    AdminBadge,
    AdminEmptyState,
    AdminLoading,
    AdminPageHeader,
    admin,
} from '@/components/admin/admin-ui';

type Alert = {
    id: string;
    user_id?: string | null;
    alert_type: string;
    severity: string;
    message: string;
    user_email?: string;
    created_at: string;
    resolved: boolean;
};

function severityTone(severity: string): 'danger' | 'warning' | 'default' {
    if (severity === 'critical') return 'danger';
    if (severity === 'warning') return 'warning';
    return 'default';
}

export default function AdminCompliancePage() {
    const [data, setData] = useState<{
        alerts: Alert[];
        tierStats: { kyc_tier: string; c: number }[];
        pendingPhoneTransfers: number;
        last24h: { tx_count: number; volume: number };
        unresolvedCount?: number;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const [resolveNote, setResolveNote] = useState('');

    const load = (all = showAll) => {
        setLoading(true);
        const q = all ? '?unresolved=false' : '';
        fetch(`/api/admin/compliance${q}`)
            .then((r) => r.json())
            .then(setData)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load(showAll);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when filter toggles
    }, [showAll]);

    const resolve = async (alertId: string) => {
        setResolvingId(alertId);
        try {
            await fetch('/api/admin/compliance', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alertId, note: resolveNote }),
            });
            setResolveNote('');
            load(showAll);
        } finally {
            setResolvingId(null);
        }
    };

    if (loading && !data) return <AdminLoading />;

    const unresolved = data?.unresolvedCount ?? data?.alerts?.length ?? 0;

    return (
        <div className="space-y-6 lg:space-y-8">
            <AdminPageHeader
                eyebrow="Risk"
                title="Compliance & monitoring"
                subtitle="BoZ VASP readiness — tier limits, alerts, and transaction monitoring."
                action={
                    <button
                        type="button"
                        className={admin.btnSecondary}
                        onClick={() => setShowAll((v) => !v)}
                    >
                        {showAll ? 'Show unresolved' : 'Show all'}
                    </button>
                }
            />

            <div className="grid gap-3 sm:grid-cols-3">
                <div className={`${admin.card} p-3.5`}>
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-medium text-slate-500">24h transactions</p>
                        <div className="rounded-lg bg-sky-50/80 p-1.5 text-sky-700 ring-1 ring-inset ring-black/[0.03]">
                            <History className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                        {(data?.last24h?.tx_count ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">Last 24 hours</p>
                </div>
                <div className={`${admin.card} p-3.5`}>
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-medium text-slate-500">Pending phone claims</p>
                        <div className="rounded-lg bg-violet-50/80 p-1.5 text-violet-700 ring-1 ring-inset ring-black/[0.03]">
                            <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                        {(data?.pendingPhoneTransfers ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">Awaiting claim</p>
                </div>
                <div className={`${admin.card} p-3.5`}>
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-medium text-slate-500">Unresolved alerts</p>
                        <div
                            className={`rounded-lg p-1.5 ring-1 ring-inset ring-black/[0.03] ${
                                unresolved > 0
                                    ? 'bg-amber-50/80 text-amber-700'
                                    : 'bg-emerald-50/80 text-emerald-700'
                            }`}
                        >
                            <ShieldAlert className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                        {unresolved.toLocaleString()}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">Needs review</p>
                </div>
            </div>

            <div className={`${admin.card} px-5 py-4`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">KYC tiers</p>
                <div className="mt-3 flex flex-wrap gap-2">
                    {(data?.tierStats ?? []).length === 0 ? (
                        <p className="text-[13px] text-slate-500">No tier data yet.</p>
                    ) : (
                        (data?.tierStats ?? []).map((t) => (
                            <AdminBadge key={t.kyc_tier} tone="default">
                                {t.kyc_tier}: {t.c}
                            </AdminBadge>
                        ))
                    )}
                </div>
            </div>

            <div className={admin.card}>
                <div className="flex flex-col gap-3 border-b border-slate-100/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="rounded-xl bg-amber-50/80 p-2 text-amber-700 ring-1 ring-inset ring-black/[0.03]">
                            <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                                {showAll ? 'All alerts' : 'Unresolved alerts'}
                            </h2>
                            <p className="text-[11px] text-slate-400">
                                {(data?.alerts ?? []).length} shown
                            </p>
                        </div>
                    </div>
                    <input
                        type="text"
                        value={resolveNote}
                        onChange={(e) => setResolveNote(e.target.value)}
                        placeholder="Optional resolve note…"
                        className={`${admin.input} max-w-xs text-[13px]`}
                    />
                </div>
                <div className="divide-y divide-slate-50">
                    {(data?.alerts ?? []).length === 0 ? (
                        <AdminEmptyState
                            message={showAll ? 'No alerts recorded.' : 'No unresolved alerts.'}
                        />
                    ) : (
                        (data?.alerts ?? []).map((a) => (
                            <div
                                key={a.id}
                                className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 transition hover:bg-slate-50/70"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <AdminBadge tone={severityTone(a.severity)}>
                                            {a.severity}
                                        </AdminBadge>
                                        <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-100">
                                            {a.alert_type}
                                        </span>
                                        {a.resolved && <AdminBadge tone="success">Resolved</AdminBadge>}
                                    </div>
                                    <p className="mt-2 text-[13px] font-medium text-slate-800">{a.message}</p>
                                    <p className="mt-1 text-[11px] text-slate-400">
                                        {a.user_id ? (
                                            <Link
                                                href={`/admin/users/${a.user_id}`}
                                                className="font-semibold text-[#8B7344] hover:text-[var(--brand-accent)]"
                                            >
                                                {a.user_email ?? 'View user'}
                                            </Link>
                                        ) : (
                                            a.user_email ?? '—'
                                        )}{' '}
                                        · {new Date(a.created_at).toLocaleString()}
                                    </p>
                                </div>
                                {!a.resolved && (
                                    <button
                                        type="button"
                                        onClick={() => resolve(a.id)}
                                        disabled={resolvingId === a.id}
                                        className="text-[12px] font-semibold text-[#8B7344] hover:text-[var(--brand-accent)] disabled:opacity-50"
                                    >
                                        {resolvingId === a.id ? 'Resolving…' : 'Resolve'}
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
