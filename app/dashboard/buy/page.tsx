'use client';

import { useState } from 'react';
import { ArrowDownLeft, Loader2 } from 'lucide-react';

const RATES = { xlm: 3.5, usdc: 25 } as const;

export default function BuyPage() {
    const [asset, setAsset] = useState<'xlm' | 'usdc'>('xlm');
    const [amount, setAmount] = useState('');
    const [phone, setPhone] = useState('');
    const [operator, setOperator] = useState<'mtn' | 'airtel' | 'zamtel'>('mtn');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const rate = RATES[asset];
    const minZmw = asset === 'xlm' ? 4 : 25;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus('idle');
        setErrorMessage('');

        try {
            const res = await fetch('/api/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, phone, operator, asset }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
            } else {
                setErrorMessage(data.error || 'Something went wrong');
                setStatus('error');
            }
        } catch (error) {
            setErrorMessage('Network error. Please try again.');
            setStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200/60 sm:rounded-tl-[1.5rem]">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="p-2.5 sm:p-3 bg-emerald-100 rounded-2xl text-emerald-600">
                        <ArrowDownLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold font-heading">Deposit</h2>
                </div>

                {status === 'success' ? (
                    <div className="text-center py-6 sm:py-8">
                        <div className="text-green-500 text-4xl sm:text-5xl mb-3 sm:mb-4">✓</div>
                        <h3 className="text-lg sm:text-xl font-bold font-heading mb-2">Payment Initiated</h3>
                        <p className="text-slate-500 text-sm sm:text-base">Check your phone to authorize the transaction.</p>
                        <button
                            onClick={() => setStatus('idle')}
                            className="mt-6 w-full min-h-[48px] py-3 bg-slate-100 rounded-xl font-semibold hover:bg-slate-200 active:bg-slate-300 transition-colors"
                        >
                            Deposit More
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                        {status === 'error' && errorMessage && (
                            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                                {errorMessage}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Asset</label>
                            <select
                                value={asset}
                                onChange={(e) => setAsset(e.target.value as 'xlm' | 'usdc')}
                                className="w-full px-4 py-3 min-h-[48px] rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-base transition-all"
                            >
                                <option value="xlm">XLM (Stellar Lumens)</option>
                                <option value="usdc">USDC (Stellar)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Amount (ZMW)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">ZMW</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full pl-16 pr-4 py-3 min-h-[48px] rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-base sm:text-lg font-semibold transition-all"
                                    placeholder="0.00"
                                    min={minZmw}
                                    required
                                />
                            </div>
                            <p className="text-sm text-slate-500 mt-2">
                                You&apos;ll receive ~{(Number(amount || 0) / rate).toFixed(2)} {asset.toUpperCase()} (rate: {rate} ZMW/{asset === 'usdc' ? 'USDC' : 'XLM'}). Min {minZmw} ZMW.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Mobile Network</label>
                            <select
                                value={operator}
                                onChange={(e) => setOperator(e.target.value as 'mtn' | 'airtel' | 'zamtel')}
                                className="w-full px-4 py-3 min-h-[48px] rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-base transition-all"
                            >
                                <option value="mtn">MTN</option>
                                <option value="airtel">Airtel</option>
                                <option value="zamtel">Zamtel</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Mobile Number</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-4 py-3 min-h-[48px] rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-base transition-all"
                                placeholder="+260 97 123 4567"
                                inputMode="tel"
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1">Zambian number (e.g. +260971234567)</p>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full min-h-[52px] bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                        >
                            {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                            {isLoading ? 'Processing...' : 'Proceed to Payment'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
