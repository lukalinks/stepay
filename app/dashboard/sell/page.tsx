'use client';

import { useState } from 'react';
import { ArrowUpRight, Loader2, CheckCircle } from 'lucide-react';

const RATES = { xlm: 3.5, usdc: 25 } as const;

export default function SellPage() {
    const [asset, setAsset] = useState<'xlm' | 'usdc'>('xlm');
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSell = async (e: React.FormEvent) => {
        e.preventDefault();
        const min = asset === 'usdc' ? 1 : 3;
        if (!amount || Number(amount) < min) {
            setError(`Please enter at least ${min} ${asset.toUpperCase()} to cash out`);
            return;
        }
        setIsLoading(true);
        setError('');
        setStatus('idle');

        try {
            const res = await fetch('/api/sell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, asset }),
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok && data.success) {
                setStatus('success');
                setMessage(data.message || `Cashed out ${amount} ${asset.toUpperCase()} successfully.`);
            } else {
                setStatus('error');
                setError(data.error || data.message || `Sell failed (${res.status})`);
            }
        } catch (err) {
            console.error(err);
            setStatus('error');
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200/60 sm:rounded-tr-[1.5rem]">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="p-2.5 sm:p-3 bg-teal-100 rounded-2xl text-teal-600">
                        <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-heading">Cash Out</h2>
                </div>

                {status === 'success' ? (
                    <div className="text-center py-6">
                        <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Cash Out Complete!</h3>
                        <p className="text-slate-600 mb-6">{message}</p>
                        <button
                            onClick={() => { setStatus('idle'); setAmount(''); setMessage(''); }}
                            className="w-full min-h-[48px] py-3 bg-slate-100 rounded-xl font-semibold hover:bg-slate-200 active:bg-slate-300 transition-colors"
                        >
                            Cash Out More
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSell} className="space-y-4 sm:space-y-6">
                        {error && (
                            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Asset</label>
                            <select
                                value={asset}
                                onChange={(e) => { setAsset(e.target.value as 'xlm' | 'usdc'); setError(''); }}
                                className="w-full px-4 py-3 min-h-[48px] rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-base transition-all"
                            >
                                <option value="xlm">XLM (Stellar Lumens)</option>
                                <option value="usdc">USDC (Stellar)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Amount to Cash Out ({asset.toUpperCase()})</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => { setAmount(e.target.value); setError(''); }}
                                    className="w-full px-4 py-3 min-h-[48px] rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-base sm:text-lg font-semibold transition-all"
                                    placeholder="0.00"
                                    min={asset === 'usdc' ? 1 : 3}
                                    step={asset === 'usdc' ? 0.01 : 0.0000001}
                                    required
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">{asset.toUpperCase()}</span>
                            </div>
                            <p className="text-sm text-slate-500 mt-2">≈ ZMW {(Number(amount || 0) * RATES[asset]).toFixed(2)} to your mobile money</p>
                        </div>

                        <div className="rounded-xl bg-teal-50 border border-teal-100 p-3 text-sm text-teal-800">
                            Crypto will be deducted from your Stepay wallet and ZMW sent to your mobile number.
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full min-h-[52px] bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 shadow-lg shadow-teal-500/25"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUpRight className="w-5 h-5" />}
                            {isLoading ? 'Cashing out...' : 'Cash Out & Withdraw'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
