'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowDownLeft, ArrowUpRight, Send, ExternalLink, RefreshCw, Repeat } from 'lucide-react';
import {
    AdminBadge,
    AdminEmptyState,
    AdminErrorBanner,
    AdminLoading,
    AdminPageHeader,
    AdminPagination,
    admin,
    txStatusTone,
} from '@/components/admin/admin-ui';

interface TxRow {
    id: string;
    type: string;
    asset: string;
    amountFiat: number;
    amountXlm: number;
    status: string;
    reference: string;
    txHash: string | null;
    createdAt: string;
    user: { id: string; email: string; phone: string } | null;
}

const PAGE_SIZE = 50;

function formatCrypto(amount: number, asset: string): string {
    const n = Number(amount) || 0;
    if (asset === 'usdc') return n.toFixed(2);
    if (n >= 1) return parseFloat(n.toFixed(4)).toString();
    return parseFloat(n.toFixed(6)).toString();
}

function AdminTransactionsContent() {
    const searchParams = useSearchParams();
    const [txs, setTxs] = useState<TxRow[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status')?.toUpperCase() || '');

    const fetchTxs = useCallback(() => {
        setLoading(true);
        setError('');
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
        if (typeFilter) params.set('type', typeFilter);
        if (statusFilter) params.set('status', statusFilter);
        fetch(`/api/admin/transactions?${params}`)
            .then((res) => {
                if (!res.ok) throw new Error('Could not load transactions');
                return res.json();
            })
            .then((data) => {
                setTxs(data.transactions);
                setTotal(data.total);
            })
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
            .finally(() => setLoading(false));
    }, [typeFilter, statusFilter, offset]);

    useEffect(() => {
        fetchTxs();
    }, [fetchTxs]);

    const typeIcon = (t: string) => {
        if (t === 'BUY') return <ArrowDownLeft className="h-4 w-4 text-emerald-600" />;
        if (t === 'SEND') return <Send className="h-4 w-4 text-violet-600" />;
        if (t === 'SWAP') return <Repeat className="h-4 w-4 text-blue-600" />;
        return <ArrowUpRight className="h-4 w-4 text-slate-600" />;
    };

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Transactions"
                subtitle={`${total.toLocaleString()} total records`}
                action={
                    <button type="button" onClick={fetchTxs} disabled={loading} className={admin.btnSecondary}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                }
            />

            {error && <AdminErrorBanner message={error} />}

            <div className={admin.card}>
                <div className={admin.cardHeader}>
                    <div className="flex flex-wrap gap-2">
                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setOffset(0);
                            }}
                            className={admin.select}
                        >
                            <option value="">All types</option>
                            <option value="BUY">BUY</option>
                            <option value="SELL">SELL</option>
                            <option value="SEND">SEND</option>
                            <option value="SWAP">SWAP</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setOffset(0);
                            }}
                            className={admin.select}
                        >
                            <option value="">All statuses</option>
                            <option value="PENDING">PENDING</option>
                            <option value="PROCESSING">PROCESSING</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="FAILED">FAILED</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <AdminLoading />
                    ) : (
                        <table className="w-full min-w-[880px] text-sm">
                            <thead className="bg-slate-50/80 text-left">
                                <tr>
                                    <th className="px-5 py-3.5 font-semibold text-slate-600">Type</th>
                                    <th className="px-5 py-3.5 font-semibold text-slate-600">Amount</th>
                                    <th className="px-5 py-3.5 font-semibold text-slate-600">User</th>
                                    <th className="px-5 py-3.5 font-semibold text-slate-600">Status</th>
                                    <th className="px-5 py-3.5 font-semibold text-slate-600">Date</th>
                                    <th className="px-5 py-3.5 font-semibold text-slate-600">Reference</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {txs.map((tx) => (
                                    <tr key={tx.id} className="transition-colors hover:bg-slate-50/70">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                {typeIcon(tx.type)}
                                                <span className="font-medium text-slate-800">{tx.type}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="font-medium tabular-nums">
                                                {formatCrypto(tx.amountXlm, tx.asset || 'xlm')} {tx.asset?.toUpperCase() || 'XLM'}
                                            </span>
                                            <span className="ml-1 text-slate-500 tabular-nums">
                                                (ZMW {Number(tx.amountFiat).toLocaleString(undefined, { minimumFractionDigits: 2 })})
                                            </span>
                                        </td>
                                        <td
                                            className="max-w-[160px] truncate px-5 py-4 text-slate-600"
                                            title={tx.user?.email || tx.user?.phone}
                                        >
                                            {tx.user?.email || tx.user?.phone || tx.id.slice(0, 8)}
                                        </td>
                                        <td className="px-5 py-4">
                                            <AdminBadge tone={txStatusTone(tx.status)}>{tx.status}</AdminBadge>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                            {new Date(tx.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1">
                                                <code className="max-w-[120px] truncate rounded bg-slate-100 px-2 py-1 text-xs">
                                                    {tx.reference}
                                                </code>
                                                {tx.txHash && (
                                                    <a
                                                        href={`https://stellar.expert/explorer/public/tx/${tx.txHash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[var(--brand-accent)] hover:opacity-80"
                                                        title="View on Stellar"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {!loading && txs.length === 0 && (
                        <AdminEmptyState message="No transactions match your filters." />
                    )}
                </div>
                <AdminPagination offset={offset} limit={PAGE_SIZE} total={total} onChange={setOffset} />
            </div>
        </div>
    );
}

export default function AdminTransactionsPage() {
    return (
        <Suspense fallback={<AdminLoading />}>
            <AdminTransactionsContent />
        </Suspense>
    );
}
