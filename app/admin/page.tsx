'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Settings, Users, History, Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-slate-500 text-sm mt-1">Overview of platform activity</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase">Total Users</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.users ?? 0}</p>
                        </div>
                        <div className="rounded-lg bg-teal-100 p-3">
                            <Users className="h-5 w-5 text-teal-600" />
                        </div>
                    </div>
                    <Link href="/admin/users" className="mt-3 text-sm text-teal-600 hover:text-teal-700 font-medium">
                        View users →
                    </Link>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase">Transactions</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.transactions ?? 0}</p>
                        </div>
                        <div className="rounded-lg bg-slate-100 p-3">
                            <History className="h-5 w-5 text-slate-600" />
                        </div>
                    </div>
                    <Link href="/admin/transactions" className="mt-3 text-sm text-teal-600 hover:text-teal-700 font-medium">
                        View all →
                    </Link>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase">Pending</p>
                            <p className="text-2xl font-bold text-amber-600 mt-1">{stats?.pendingCount ?? 0}</p>
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Awaiting confirmation</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase">Today&apos;s Volume</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">ZMW {(stats?.todayVolume ?? 0).toFixed(2)}</p>
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                        Buy: {(stats?.todayBuyVolume ?? 0).toFixed(2)} · Sell: {(stats?.todaySellVolume ?? 0).toFixed(2)}
                    </p>
                </div>
            </div>

            <div className=" rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="font-semibold text-slate-800">Pending Transactions</h2>
                    <Link href="/admin/transactions?status=PENDING" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
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
                                        <p className="font-medium text-slate-800">{tx.type} {tx.amount_xlm} {((tx as { asset?: string }).asset || 'xlm').toUpperCase()}</p>
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
                    className="flex items-center gap-4 rounded-xl border border-slate-200 p-5 transition-colors hover:bg-slate-50"
                >
                    <div className="rounded-lg bg-teal-100 p-3">
                        <Settings className="h-6 w-6 text-teal-600" />
                    </div>
                    <div>
                        <p className="font-medium text-slate-800">Fees & Rates</p>
                        <p className="text-sm text-slate-500">Set XLM/USDC buy and sell rates, fee percentages</p>
                    </div>
                </Link>
                <Link
                    href="/admin/users"
                    className="flex items-center gap-4 rounded-xl border border-slate-200 p-5 transition-colors hover:bg-slate-50"
                >
                    <div className="rounded-lg bg-slate-100 p-3">
                        <Users className="h-6 w-6 text-slate-600" />
                    </div>
                    <div>
                        <p className="font-medium text-slate-800">Users</p>
                        <p className="text-sm text-slate-500">View and search all registered users</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
