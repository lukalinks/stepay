'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Settings, Users, History, Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

function formatAdminCrypto(amount: number, asset: string): string {
    const n = Number(amount) || 0;
    if (asset === 'usdc') return n.toFixed(2);
    if (n >= 1) return parseFloat(n.toFixed(4)).toString();
    if (n >= 0.0001) return parseFloat(n.toFixed(6)).toString();
    return n.toFixed(7);
}

export default function AdminPage() {
    const [stats, setStats] = useState<{
        users: number;
        transactions: number;
        pendingCount: number;
        pending: Array<{ id: string; type: string; reference: string; amount_fiat: number; amount_xlm: number; status: string; created_at: string }>;
        todayVolume: number;
        todayBuyVolume: number;
        todaySellVolume: number;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/stats')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => data && setStats(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 lg:space-y-8">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-500">Overview of platform activity</p>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Link href="/admin/users" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md hover:border-slate-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Users</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{stats?.users ?? 0}</p>
                        </div>
                        <div className="rounded-xl bg-teal-100 p-3 transition-colors group-hover:bg-teal-200/80">
                            <Users className="h-6 w-6 text-teal-600" />
                        </div>
                    </div>
                    <p className="mt-3 text-sm font-medium text-teal-600 group-hover:text-teal-700">View users →</p>
                </Link>
                <Link href="/admin/transactions" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md hover:border-slate-300">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Transactions</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{stats?.transactions ?? 0}</p>
                        </div>
                        <div className="rounded-xl bg-slate-100 p-3 transition-colors group-hover:bg-slate-200/80">
                            <History className="h-6 w-6 text-slate-600" />
                        </div>
                    </div>
                    <p className="mt-3 text-sm font-medium text-teal-600 group-hover:text-teal-700">View all →</p>
                </Link>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending</p>
                            <p className="mt-2 text-2xl font-bold text-amber-600 sm:text-3xl">{stats?.pendingCount ?? 0}</p>
                        </div>
                        <div className="rounded-xl bg-amber-100 p-3">
                            <History className="h-6 w-6 text-amber-600" />
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Awaiting confirmation</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today&apos;s Volume</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">ZMW {(stats?.todayVolume ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                        Buy: {(stats?.todayBuyVolume ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} · Sell: {(stats?.todaySellVolume ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 px-6 py-4 sm:px-6 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-slate-900">Pending Transactions</h2>
                    <Link href="/admin/transactions?status=PENDING" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                        View all →
                    </Link>
                </div>
                <div className="divide-y divide-slate-100">
                    {stats?.pending?.length ? (
                        stats.pending.slice(0, 5).map((tx) => (
                            <div key={tx.id} className="px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${tx.type === 'BUY' ? 'bg-emerald-100' : 'bg-teal-100'}`}>
                                        {tx.type === 'BUY' ? <ArrowDownLeft className="h-4 w-4 text-emerald-600" /> : <ArrowUpRight className="h-4 w-4 text-teal-600" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-800">{tx.type} {formatAdminCrypto(Number(tx.amount_xlm), (tx as { asset?: string }).asset || 'xlm')} {((tx as { asset?: string }).asset || 'xlm').toUpperCase()}</p>
                                        <p className="text-xs text-slate-500">{tx.reference} · {new Date(tx.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">Pending</span>
                            </div>
                        ))
                    ) : (
                        <div className="px-6 py-8 text-center text-slate-500 text-sm">No pending transactions</div>
                    )}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Link
                    href="/admin/settings"
                    className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-teal-200 hover:shadow-md"
                >
                    <div className="rounded-xl bg-teal-100 p-3 transition-colors group-hover:bg-teal-200/80">
                        <Settings className="h-6 w-6 text-teal-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">Fees & Rates</p>
                        <p className="text-sm text-slate-500">Set XLM/USDC rates, limits, and fee percentages</p>
                    </div>
                </Link>
                <Link
                    href="/admin/users"
                    className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
                >
                    <div className="rounded-xl bg-slate-100 p-3 transition-colors group-hover:bg-slate-200/80">
                        <Users className="h-6 w-6 text-slate-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">Users</p>
                        <p className="text-sm text-slate-500">View and search all registered users</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
