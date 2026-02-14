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

    useEffect(() => {
        fetch('/api/admin/settings')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load');
                return res.json();
            })
            .then((data) => {
                if (data.rates) setRates(data.rates);
                if (data.fee) setFees(data.fee);
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
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-900">Fees & Rates</h2>
                <p className="text-sm text-slate-500">ZMW per 1 XLM/USDC. Separate buy/sell rates allow spread-based fees.</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {message === 'success' && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm">
                        Settings saved. New rates apply immediately.
                    </div>
                )}
                {message === 'error' && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
                        Failed to save. Check you have admin access.
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
                                onChange={(e) => setRates({ ...rates, xlm_buy: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">XLM Sell</label>
                            <input
                                type="number"
                                step="0.01"
                                value={rates.xlm_sell}
                                onChange={(e) => setRates({ ...rates, xlm_sell: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">USDC Buy</label>
                            <input
                                type="number"
                                step="0.01"
                                value={rates.usdc_buy}
                                onChange={(e) => setRates({ ...rates, usdc_buy: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">USDC Sell</label>
                            <input
                                type="number"
                                step="0.01"
                                value={rates.usdc_sell}
                                onChange={(e) => setRates({ ...rates, usdc_sell: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
                                onChange={(e) => setFees({ ...fees, buy_percent: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
                                onChange={(e) => setFees({ ...fees, sell_percent: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="min-h-[44px] rounded-xl bg-teal-600 px-6 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-70 flex items-center gap-2"
                >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? 'Saving...' : 'Save changes'}
                </button>
            </form>
        </div>
    );
}
