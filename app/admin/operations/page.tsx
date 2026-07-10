'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Wrench } from 'lucide-react';
import {
    AdminBadge,
    AdminEmptyState,
    AdminErrorBanner,
    AdminLoading,
    AdminPageHeader,
    admin,
    txStatusTone,
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
        <div className="space-y-6">
            <AdminPageHeader
                title="Operations"
                subtitle="Stuck swap and cash-out queue — retry finalize when crypto reached the platform"
                action={
                    <div className="flex flex-wrap gap-2">
                        {canRunOps && (
                            <button type="button" onClick={retryAll} disabled={retrying} className={admin.btnPrimary}>
                                <Wrench className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
                                Retry all stuck
                            </button>
                        )}
                        <button type="button" onClick={load} disabled={loading} className={admin.btnSecondary}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                }
            />

            {error && <AdminErrorBanner message={error} />}

            <div className={admin.card}>
                <div className={admin.cardHeader}>
                    <h2 className="font-semibold text-slate-800">
                        Stuck transactions ({stuck.length})
                    </h2>
                </div>
                {loading ? (
                    <AdminLoading />
                ) : stuck.length === 0 ? (
                    <AdminEmptyState message="No stuck SWAP or SELL transactions in the last 14 days." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-sm">
                            <thead className="bg-slate-50/80 text-left">
                                <tr>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Type</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">User</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Amount</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Reference</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stuck.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="cursor-pointer hover:bg-slate-50/70"
                                        onClick={() => setSelectedTx(row.id)}
                                    >
                                        <td className="px-5 py-3 font-medium">{row.type}</td>
                                        <td className="px-5 py-3">
                                            <Link
                                                href={`/admin/users/${row.userId}`}
                                                className="text-[var(--brand-accent)] hover:underline"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {row.userEmail}
                                            </Link>
                                        </td>
                                        <td className="px-5 py-3 tabular-nums">
                                            {row.amountXlm} {row.asset?.toUpperCase()} · ZMW {Number(row.amountFiat).toFixed(2)}
                                        </td>
                                        <td className="px-5 py-3">
                                            <AdminBadge tone={txStatusTone(row.status)}>{row.status}</AdminBadge>
                                        </td>
                                        <td className="px-5 py-3 font-mono text-xs">{row.reference}</td>
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
