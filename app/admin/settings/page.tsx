'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AdminSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<'success' | 'error' | null>(null);
    const [rates, setRates] = useState({
        xlm_buy: 3.5,
        xlm_sell: 3.5,
        usdc_buy: 25,
        usdc_sell: 25,
    });
    const [fees, setFees] = useState({ buy_percent: 0, sell_percent: 0 });
    const [limits, setLimits] = useState({
        min_deposit_zmw: 4,
        max_deposit_zmw: 50000,
        min_withdraw_zmw: 4,
        max_withdraw_zmw: 50000,
    });

    useEffect(() => {
        fetch('/api/admin/settings')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load');
                return res.json();
            })
            .then((data) => {
                if (data.rates) setRates(data.rates);
                if (data.fee) setFees(data.fee);
                if (data.limits) setLimits(data.limits);
            })
            .catch(() => setMessage('error'))
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rates: {
                        xlm_buy: Number(rates.xlm_buy),
                        xlm_sell: Number(rates.xlm_sell),
                        usdc_buy: Number(rates.usdc_buy),
                        usdc_sell: Number(rates.usdc_sell),
                    },
                    fee: {
                        buy_percent: Number(fees.buy_percent),
                        sell_percent: Number(fees.sell_percent),
                    },
                    limits: {
                        min_deposit_zmw: Number(limits.min_deposit_zmw),
                        max_deposit_zmw: Number(limits.max_deposit_zmw),
                        min_withdraw_zmw: Number(limits.min_withdraw_zmw),
                        max_withdraw_zmw: Number(limits.max_withdraw_zmw),
                    },
                }),
            });
            if (res.ok) {
                setMessage('success');
            } else {
                setMessage('error');
            }
        } catch {
            setMessage('error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Settings</h1>
                <p className="mt-1 text-sm text-slate-500">Rates, limits, and fees for deposits and withdrawals</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-4 sm:px-6">
                    <h2 className="text-lg font-semibold text-slate-900">Fees & Rates</h2>
                    <p className="mt-1 text-sm text-slate-500">ZMW per 1 XLM/USDC. Separate buy/sell rates allow spread-based fees.</p>
                </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {message === 'success' && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm">
                        Settings saved. Your new rates and limits apply immediately for all users.
                    </div>
                )}
                {message === 'error' && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm">
                        We couldn&apos;t save your changes. Make sure you&apos;re signed in as an admin.
                    </div>
                )}

                <div>
                    <h3 className="font-semibold text-slate-700 mb-3">Rates (ZMW per unit)</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">XLM Buy</label>
                            <input
                                type="number"
                                step="0.01"
                                value={rates.xlm_buy}
                                onChange={(e) => setRates({ ...rates, xlm_buy: parseFloat(e.target.value) || 0 })}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">XLM Sell</label>
                            <input
                                type="number"
                                step="0.01"
                                value={rates.xlm_sell}
                                onChange={(e) => setRates({ ...rates, xlm_sell: parseFloat(e.target.value) || 0 })}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">USDC Buy</label>
                            <input
                                type="number"
                                step="0.01"
                                value={rates.usdc_buy}
                                onChange={(e) => setRates({ ...rates, usdc_buy: parseFloat(e.target.value) || 0 })}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">USDC Sell</label>
                            <input
                                type="number"
                                step="0.01"
                                value={rates.usdc_sell}
                                onChange={(e) => setRates({ ...rates, usdc_sell: parseFloat(e.target.value) || 0 })}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold text-slate-700 mb-3">Deposit Limits (ZMW)</h3>
                    <p className="text-xs text-slate-500 mb-3">Min and max ZMW allowed per deposit.</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Min deposit (ZMW)</label>
                            <input
                                type="number"
                                step="1"
                                min="1"
                                value={limits.min_deposit_zmw}
                                onChange={(e) => setLimits({ ...limits, min_deposit_zmw: parseFloat(e.target.value) || 1 })}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Max deposit (ZMW)</label>
                            <input
                                type="number"
                                step="1"
                                min="1"
                                value={limits.max_deposit_zmw}
                                onChange={(e) => setLimits({ ...limits, max_deposit_zmw: parseFloat(e.target.value) || 50000 })}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold text-slate-700 mb-3">Withdraw Limits (ZMW)</h3>
                    <p className="text-xs text-slate-500 mb-3">Min and max ZMW payout per cash out.</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Min withdraw (ZMW)</label>
                            <input
                                type="number"
                                step="1"
                                min="1"
                                value={limits.min_withdraw_zmw}
                                onChange={(e) => setLimits({ ...limits, min_withdraw_zmw: parseFloat(e.target.value) || 1 })}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Max withdraw (ZMW)</label>
                            <input
                                type="number"
                                step="1"
                                min="1"
                                value={limits.max_withdraw_zmw}
                                onChange={(e) => setLimits({ ...limits, max_withdraw_zmw: parseFloat(e.target.value) || 50000 })}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold text-slate-700 mb-3">Fee (%)</h3>
                    <p className="text-xs text-slate-500 mb-3">Percentage taken from user&apos;s crypto (buy) or ZMW (sell).</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Buy fee %</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={fees.buy_percent}
                                onChange={(e) => setFees({ ...fees, buy_percent: parseFloat(e.target.value) || 0 })}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Sell fee %</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={fees.sell_percent}
                                onChange={(e) => setFees({ ...fees, sell_percent: parseFloat(e.target.value) || 0 })}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="flex min-h-[48px] items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-70"
                >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? 'Saving...' : 'Save changes'}
                </button>
            </form>
            </div>
        </div>
    );
}
