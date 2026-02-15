'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, ArrowDownLeft, ArrowUpRight, Send, ExternalLink } from 'lucide-react';

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

export default function AdminTransactionsPage() {
    const [txs, setTxs] = useState<TxRow[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const fetchTxs = () => {
        setLoading(true);
        const params = new URLSearchParams({ limit: '50' });
        if (typeFilter) params.set('type', typeFilter);
        if (statusFilter) params.set('status', statusFilter);
        fetch(`/api/admin/transactions?${params}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data) {
                    setTxs(data.transactions);
                    setTotal(data.total);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchTxs();
    }, [typeFilter, statusFilter]);

    const typeIcon = (t: string) => {
        if (t === 'BUY') return <ArrowDownLeft className="h-4 w-4 text-emerald-600" />;
        if (t === 'SEND') return <Send className="h-4 w-4 text-violet-600" />;
        return <ArrowUpRight className="h-4 w-4 text-teal-600" />;
    };

    const statusColor = (s: string) => {
        if (s === 'COMPLETED') return 'bg-emerald-100 text-emerald-800';
        if (s === 'PENDING') return 'bg-amber-100 text-amber-800';
        return 'bg-red-100 text-red-800';
    };

    function formatCrypto(amount: number, asset: string): string {
        const n = Number(amount) || 0;
        if (asset === 'usdc') return n.toFixed(2);
        if (n >= 1) return parseFloat(n.toFixed(4)).toString();
        return parseFloat(n.toFixed(6)).toString();
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Transactions</h1>
                    <p className="mt-1 text-sm text-slate-500">{total} total</p>
                </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 px-6 py-4 sm:px-6">
                    <div className="flex flex-wrap gap-2">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                    >
                        <option value="">All types</option>
                        <option value="BUY">BUY</option>
                        <option value="SELL">SELL</option>
                        <option value="SEND">SEND</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                    >
                        <option value="">All statuses</option>
                        <option value="PENDING">PENDING</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="FAILED">FAILED</option>
                    </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50/80 text-left">
                            <tr>
                                <th className="px-6 py-3.5 font-semibold text-slate-600">Type</th>
                                <th className="px-6 py-3.5 font-semibold text-slate-600">Amount</th>
                                <th className="px-6 py-3.5 font-semibold text-slate-600">User</th>
                                <th className="px-6 py-3.5 font-semibold text-slate-600">Status</th>
                                <th className="px-6 py-3.5 font-semibold text-slate-600">Date</th>
                                <th className="px-6 py-3.5 font-semibold text-slate-600">Ref</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {txs.map((tx) => (
                                <tr key={tx.id} className="transition-colors hover:bg-slate-50/70">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {typeIcon(tx.type)}
                                            <span className="font-medium text-slate-800">{tx.type}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-medium">{formatCrypto(tx.amountXlm, tx.asset || 'xlm')} {tx.asset?.toUpperCase() || 'XLM'}</span>
                                        <span className="ml-1 text-slate-500">(ZMW {Number(tx.amountFiat).toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 max-w-[140px] truncate" title={tx.user?.email || tx.user?.phone}>
                                        {tx.user?.email || tx.user?.phone || tx.id.slice(0, 8)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(tx.status)}`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{new Date(tx.createdAt).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1">
                                            <code className="text-xs bg-slate-100 px-2 py-1 rounded">{tx.reference}</code>
                                            {tx.txHash && (
                                                <a
                                                    href={`https://stellar.expert/explorer/public/tx/${tx.txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-teal-600 hover:text-teal-700"
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
                    <div className="py-16 text-center text-slate-500">No transactions match your filters. Try adjusting them.</div>
                )}
                </div>
            </div>
        </div>
    );
}
