'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Info, RefreshCw, Wrench } from 'lucide-react';
import {
    AdminEmptyState,
    AdminErrorBanner,
    AdminLoading,
    AdminPageHeader,
    admin,
    adminTable,
    TxStatusBadge,
    formatTxType,
} from '@/components/admin/admin-ui';
import { TxDetailDrawer } from '@/components/admin/TxDetailDrawer';

type StuckRow = {
    id: string;
    userId: string;
    type: string;
    status: string;
    reference: string;
    amountFiat: number;
    amountXlm: number;
    asset: string;
    userEmail: string;
    userPhone: string;
};

export default function AdminOperationsPage() {
    const [stuck, setStuck] = useState<StuckRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retrying, setRetrying] = useState(false);
    const [selectedTx, setSelectedTx] = useState<string | null>(null);
    const [canRunOps, setCanRunOps] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        setError('');
        Promise.all([
            fetch('/api/admin/transactions/stuck').then((r) => r.json()),
            fetch('/api/admin/stats').then((r) => r.json()),
        ])
            .then(([stuckData, stats]) => {
                setStuck(stuckData.stuck ?? []);
                setCanRunOps(['admin', 'admin_ops'].includes(stats.adminRole));
            })
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const retryAll = async () => {
        setRetrying(true);
        setError('');
        try {
            const res = await fetch('/api/admin/transactions/stuck', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Retry failed');
            load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Retry failed');
        } finally {
            setRetrying(false);
        }
    };

    return (
        <div className="space-y-6 lg:space-y-8">
            <AdminPageHeader
                eyebrow="Ops"
                title="Operations"
                subtitle="Needs recovery: paid deposits without credit, stuck swaps, and cash-outs with failed payouts"
                action={
                    <div className="flex flex-wrap gap-2">
                        {canRunOps && (
                            <button type="button" onClick={retryAll} disabled={retrying} className={admin.btnPrimary}>
                                <Wrench className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                                Retry all stuck
                            </button>
                        )}
                        <button type="button" onClick={load} disabled={loading} className={admin.btnSecondary}>
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                            Refresh
                        </button>
                    </div>
                }
            />

            {error && <AdminErrorBanner message={error} />}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className={`${admin.card} p-3.5`}>
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-medium text-slate-500">Needs recovery</p>
                        <div
                            className={`rounded-lg p-1.5 ring-1 ring-inset ring-black/[0.03] ${
                                stuck.length > 0
                                    ? 'bg-amber-50/80 text-amber-700'
                                    : 'bg-emerald-50/80 text-emerald-700'
                            }`}
                        >
                            <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                        {stuck.length.toLocaleString()}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">Last 14 days</p>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className={`${admin.card} flex gap-3 p-5`}>
                    <div className="rounded-lg bg-emerald-50/80 p-1.5 text-emerald-700 ring-1 ring-inset ring-black/[0.03]">
                        <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Top-ups</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                            Paid with no Stellar credit — open the row and use Retry credit.
                        </p>
                    </div>
                </div>
                <div className={`${admin.card} flex gap-3 p-5`}>
                    <div className="rounded-lg bg-rose-50/80 p-1.5 text-rose-700 ring-1 ring-inset ring-black/[0.03]">
                        <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Payouts</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                            Crypto received but mobile-money payout failed shows as Payout failed — retry finalize.
                        </p>
                    </div>
                </div>
            </div>

            <div className={admin.card}>
                <div className="border-b border-slate-100/80 px-5 py-4">
                    <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                        Stuck transactions
                    </h2>
                    <p className="mt-0.5 text-[11px] text-slate-400">{stuck.length} requiring attention</p>
                </div>
                {loading ? (
                    <AdminLoading />
                ) : stuck.length === 0 ? (
                    <AdminEmptyState message="Nothing needs recovery in the last 14 days." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead>
                                <tr className={adminTable.head}>
                                    <th className={adminTable.th}>Type</th>
                                    <th className={adminTable.thTight}>User</th>
                                    <th className={adminTable.thTight}>Amount</th>
                                    <th className={adminTable.thTight}>Status</th>
                                    <th className={adminTable.th}>Reference</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stuck.map((row) => (
                                    <tr
                                        key={row.id}
                                        className={`${adminTable.row} cursor-pointer`}
                                        onClick={() => setSelectedTx(row.id)}
                                    >
                                        <td className={`${adminTable.td} text-[13px] font-semibold text-slate-800`}>
                                            {formatTxType(row.type)}
                                        </td>
                                        <td className={adminTable.tdTight}>
                                            <Link
                                                href={`/admin/users/${row.userId}`}
                                                className="text-[13px] font-medium text-[#8B7344] hover:text-[var(--brand-accent)]"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {row.userEmail || row.userPhone || row.userId.slice(0, 8)}
                                            </Link>
                                        </td>
                                        <td className={`${adminTable.tdTight} tabular-nums`}>
                                            <p className="text-[13px] font-semibold text-slate-800">
                                                {row.amountXlm} {(row.asset || 'xlm').toUpperCase()}
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                ZMW {Number(row.amountFiat).toFixed(2)}
                                            </p>
                                        </td>
                                        <td className={adminTable.tdTight}>
                                            <TxStatusBadge status={row.status} type={row.type} asset={row.asset} />
                                        </td>
                                        <td className={`${adminTable.td} font-mono text-[11px] text-slate-500`}>
                                            {row.reference}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <TxDetailDrawer
                txId={selectedTx}
                onClose={() => setSelectedTx(null)}
                onAction={load}
                canRunOps={canRunOps}
            />
        </div>
    );
}
