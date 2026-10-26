'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Send,
    ExternalLink,
    RefreshCw,
    Repeat,
    Search,
    Store,
    Filter,
} from 'lucide-react';
import {
    AdminEmptyState,
    AdminErrorBanner,
    AdminLoading,
    AdminPageHeader,
    AdminPagination,
    admin,
    adminTable,
    TxStatusBadge,
    formatTxType,
} from '@/components/admin/admin-ui';
import { TxDetailDrawer } from '@/components/admin/TxDetailDrawer';

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
    if (asset === 'usdc' || asset === 'usdt0') return n.toFixed(2);
    if (n >= 1) return parseFloat(n.toFixed(4)).toString();
    return parseFloat(n.toFixed(6)).toString();
}

function formatMoney(n: number) {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function typeIconBox(t: string) {
    if (t === 'BUY') {
        return (
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 ring-1 ring-inset ring-emerald-100">
                <ArrowDownLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            </div>
        );
    }
    if (t === 'SEND') {
        return (
            <div className="rounded-xl bg-violet-50 p-2 text-violet-600 ring-1 ring-inset ring-violet-100">
                <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
            </div>
        );
    }
    if (t === 'SWAP') {
        return (
            <div className="rounded-xl bg-sky-50 p-2 text-sky-600 ring-1 ring-inset ring-sky-100">
                <Repeat className="h-3.5 w-3.5" strokeWidth={1.75} />
            </div>
        );
    }
    if (t === 'CHECKOUT_MM') {
        return (
            <div className="rounded-xl bg-[var(--brand-accent-muted)] p-2 text-[#8B7344] ring-1 ring-inset ring-black/[0.03]">
                <Store className="h-3.5 w-3.5" strokeWidth={1.75} />
            </div>
        );
    }
    return (
        <div className="rounded-xl bg-rose-50 p-2 text-rose-600 ring-1 ring-inset ring-rose-100">
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
        </div>
    );
}

function AdminTransactionsContent() {
    const searchParams = useSearchParams();
    const [txs, setTxs] = useState<TxRow[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [typeFilter, setTypeFilter] = useState(() => searchParams.get('type')?.toUpperCase() || '');
    const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status')?.toUpperCase() || '');
    const [qInput, setQInput] = useState(() => searchParams.get('q') || '');
    const [q, setQ] = useState(() => searchParams.get('q') || '');
    const [selectedTx, setSelectedTx] = useState<string | null>(null);
    const [canRunOps, setCanRunOps] = useState(false);

    useEffect(() => {
        fetch('/api/admin/stats')
            .then((r) => r.json())
            .then((d) => setCanRunOps(['admin', 'admin_ops'].includes(d.adminRole)));
    }, []);

    const fetchTxs = useCallback(() => {
        setLoading(true);
        setError('');
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
        if (typeFilter) params.set('type', typeFilter);
        if (statusFilter) params.set('status', statusFilter);
        if (q.trim()) params.set('q', q.trim());
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
    }, [typeFilter, statusFilter, offset, q]);

    useEffect(() => {
        fetchTxs();
    }, [fetchTxs]);

    const filtersActive = Boolean(typeFilter || statusFilter || q.trim());

    const clearFilters = () => {
        setTypeFilter('');
        setStatusFilter('');
        setQInput('');
        setQ('');
        setOffset(0);
    };

    return (
        <div className="space-y-6 lg:space-y-8">
            <AdminPageHeader
                eyebrow="Ledger"
                title="Transactions"
                subtitle={`${total.toLocaleString()} total records`}
                action={
                    <button type="button" onClick={fetchTxs} disabled={loading} className={admin.btnSecondary}>
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                        Refresh
                    </button>
                }
            />

            {error && <AdminErrorBanner message={error} />}

            <div className={admin.card}>
                <div className="space-y-3 border-b border-slate-100/80 px-5 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <form
                            className="relative min-w-0 flex-1"
                            onSubmit={(e) => {
                                e.preventDefault();
                                setOffset(0);
                                setQ(qInput);
                            }}
                        >
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={qInput}
                                onChange={(e) => setQInput(e.target.value)}
                                placeholder="Search ref, email, phone, memo, hash…"
                                className={`${admin.input} pl-10`}
                            />
                        </form>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                                <Filter className="h-3.5 w-3.5" /> Filters
                            </span>
                            <select
                                value={typeFilter}
                                onChange={(e) => {
                                    setTypeFilter(e.target.value);
                                    setOffset(0);
                                }}
                                className={admin.select}
                                aria-label="Type filter"
                            >
                                <option value="">All types</option>
                                <option value="BUY">Top-up</option>
                                <option value="SELL">Payout</option>
                                <option value="SEND">Send</option>
                                <option value="SWAP">Swap</option>
                                <option value="CHECKOUT_MM">Checkout</option>
                            </select>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setOffset(0);
                                }}
                                className={admin.select}
                                aria-label="Status filter"
                            >
                                <option value="">All statuses</option>
                                <option value="PENDING">Awaiting</option>
                                <option value="PROCESSING">In progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="FAILED">Failed</option>
                                <option value="PAYOUT_FAILED">Payout failed</option>
                            </select>
                            {filtersActive && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="text-[12px] font-semibold text-slate-500 hover:text-slate-800"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading && txs.length === 0 ? (
                        <AdminLoading />
                    ) : (
                        <table className="w-full min-w-[880px] text-left text-sm">
                            <thead>
                                <tr className={adminTable.head}>
                                    <th className={adminTable.th}>Type</th>
                                    <th className={adminTable.thTight}>Amount</th>
                                    <th className={adminTable.thTight}>User</th>
                                    <th className={adminTable.thTight}>Status</th>
                                    <th className={adminTable.thTight}>Date</th>
                                    <th className={adminTable.th}>Reference</th>
                                </tr>
                            </thead>
                            <tbody>
                                {txs.map((tx) => (
                                    <tr
                                        key={tx.id}
                                        className={`${adminTable.row} cursor-pointer`}
                                        onClick={() => setSelectedTx(tx.id)}
                                    >
                                        <td className={adminTable.td}>
                                            <div className="flex items-center gap-2.5">
                                                {typeIconBox(tx.type)}
                                                <span className="text-[13px] font-semibold text-slate-800">
                                                    {formatTxType(tx.type)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={adminTable.tdTight}>
                                            <p className="text-[13px] font-semibold tabular-nums text-slate-800">
                                                {formatCrypto(tx.amountXlm, tx.asset || 'xlm')}{' '}
                                                {(tx.asset || 'xlm').toUpperCase()}
                                            </p>
                                            <p className="text-[11px] tabular-nums text-slate-400">
                                                ZMW {formatMoney(Number(tx.amountFiat) || 0)}
                                            </p>
                                        </td>
                                        <td
                                            className={`${adminTable.tdTight} max-w-[160px] truncate text-[13px] text-slate-600`}
                                            title={tx.user?.email || tx.user?.phone || undefined}
                                        >
                                            {tx.user?.email || tx.user?.phone || tx.id.slice(0, 8)}
                                        </td>
                                        <td className={adminTable.tdTight}>
                                            <TxStatusBadge status={tx.status} type={tx.type} asset={tx.asset} />
                                        </td>
                                        <td
                                            className={`${adminTable.tdTight} text-[12px] text-slate-500`}
                                            title={new Date(tx.createdAt).toLocaleString()}
                                        >
                                            {relativeTime(tx.createdAt)}
                                        </td>
                                        <td className={adminTable.td}>
                                            <div className="flex items-center gap-1.5">
                                                <code className="max-w-[120px] truncate rounded-lg bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-600 ring-1 ring-inset ring-slate-100">
                                                    {tx.reference}
                                                </code>
                                                {tx.txHash && (
                                                    <a
                                                        href={`https://stellar.expert/explorer/public/tx/${tx.txHash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[#8B7344] transition hover:text-[var(--brand-accent)]"
                                                        title="View on Stellar"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
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

            <TxDetailDrawer
                txId={selectedTx}
                onClose={() => setSelectedTx(null)}
                onAction={fetchTxs}
                canRunOps={canRunOps}
            />
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
