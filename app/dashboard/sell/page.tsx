'use client';

import { useState, useEffect } from 'react';
import { ArrowUpRight, Loader2, CheckCircle } from 'lucide-react';
import { Message } from '@/components/Message';

function toFriendlySellError(msg?: string): string {
    if (!msg) return 'Something went wrong. Please try again in a moment.';
    const m = msg.toLowerCase();
    if (m.includes('insufficient') || m.includes('balance')) return msg;
    if (m.includes('minimum') || m.includes('maximum')) return msg;
    if (m.includes('keep') && m.includes('xlm')) return msg;
    if (m.includes('wallet')) return 'Your wallet couldn\'t be found. Please contact support.';
    if (m.includes('payout') || m.includes('lenco')) return 'We couldn\'t send the cash to your phone right now. Your crypto is safe—please try again or contact support.';
    if (m.includes('mobile') || m.includes('phone') || m.includes('number')) return msg;
    if (m.includes('unauthorized')) return 'Please sign in again to continue.';
    return msg;
}

const DEFAULT_RATES = { xlm: { sell: 3.5 }, usdc: { sell: 25 } } as const;

export default function SellPage() {
    const [asset, setAsset] = useState<'xlm' | 'usdc'>('xlm');
    const [amount, setAmount] = useState('');
    const [phone, setPhone] = useState('');
    const [operator, setOperator] = useState<'mtn' | 'airtel' | 'zamtel'>('mtn');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [rates, setRates] = useState<{ xlm: { sell: number }; usdc: { sell: number } }>(DEFAULT_RATES);
    const [fees, setFees] = useState({ sellPercent: 0 });
    const [limits, setLimits] = useState({ minWithdrawZmw: 4, maxWithdrawZmw: 50000 });

    useEffect(() => {
        fetch('/api/rates')
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
                if (data?.rates) setRates(data.rates);
                if (data?.fees) setFees(data.fees);
                if (data?.limits) setLimits(data.limits);
            })
            .catch(() => {});
    }, []);

    const rate = rates[asset].sell;
    const feeMult = 1 - fees.sellPercent / 100;
    const zmwPerUnit = rate * feeMult;
    const minCrypto = limits.minWithdrawZmw / zmwPerUnit || 0;
    const maxCrypto = limits.maxWithdrawZmw / zmwPerUnit || Infinity;

    const handleSell = async (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = Number(amount);
        const zmwReceived = amountNum * zmwPerUnit;
        if (!amount || amountNum <= 0) {
            setError('Please enter how much you\'d like to cash out.');
            return;
        }
        if (zmwReceived < limits.minWithdrawZmw) {
            setError(`Cash outs start at ${limits.minWithdrawZmw} ZMW (about ${minCrypto.toFixed(asset === 'usdc' ? 2 : 4)} ${asset.toUpperCase()}).`);
            return;
        }
        if (zmwReceived > limits.maxWithdrawZmw) {
            setError(`We allow up to ${limits.maxWithdrawZmw} ZMW per cash out. You can make multiple withdrawals if needed.`);
            return;
        }
        const phoneDigits = phone.replace(/\s+/g, '').replace(/\D/g, '');
        const fullPhone = `+260${phoneDigits}`;
        if (!phoneDigits || phoneDigits.length < 9) {
            setError('Please enter the mobile number where you\'d like to receive your ZMW (e.g. 97 123 4567).');
            return;
        }
        setIsLoading(true);
        setError('');
        setStatus('idle');

        try {
            const res = await fetch('/api/sell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, asset, phone: fullPhone, operator }),
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok && data.success) {
                setStatus('success');
                setMessage(data.message || `Cashed out ${amount} ${asset.toUpperCase()} successfully.`);
            } else {
                setStatus('error');
                setError(toFriendlySellError(data.error || data.message));
            }
        } catch (err) {
            console.error(err);
            setStatus('error');
            setError('We couldn\'t reach our servers. Please check your connection and try again.');
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
                        <h3 className="text-xl font-bold text-slate-900 mb-2">You're all set!</h3>
                        <p className="text-slate-600 mb-6">Your cash is on its way. {message}</p>
                        <button
                            onClick={() => { setStatus('idle'); setAmount(''); setPhone(''); setMessage(''); }}
                            className="w-full min-h-[48px] py-3 bg-slate-100 rounded-xl font-semibold hover:bg-slate-200 active:bg-slate-300 transition-colors"
                        >
                            Cash Out More
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSell} className="space-y-6">
                        {error && (
                            <Message variant="warning" title="Something to fix">
                                {error}
                            </Message>
                        )}
                        <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Asset</label>
                            <select
                                value={asset}
                                onChange={(e) => { setAsset(e.target.value as 'xlm' | 'usdc'); setError(''); }}
                                className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25 outline-none text-base transition-all"
                            >
                                <option value="xlm">XLM</option>
                                <option value="usdc">USDC</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Amount ({asset.toUpperCase()})</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => { setAmount(e.target.value); setError(''); }}
                                    className="w-full px-4 pr-16 py-3.5 min-h-[48px] rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25 outline-none text-base font-semibold transition-all placeholder:text-slate-400"
                                    placeholder={asset === 'usdc' ? '0.00' : '0.0000'}
                                    min={minCrypto}
                                    max={maxCrypto === Infinity ? undefined : maxCrypto}
                                    step="any"
                                    inputMode="decimal"
                                    required
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm">{asset.toUpperCase()}</span>
                            </div>
                            <p className="text-xs text-slate-500">≈ ZMW {(Number(amount || 0) * zmwPerUnit).toFixed(2)} · {limits.minWithdrawZmw}–{limits.maxWithdrawZmw} ZMW</p>
                        </div>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2 pt-2 border-t border-slate-100">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Mobile Network</label>
                            <select
                                value={operator}
                                onChange={(e) => { setOperator(e.target.value as 'mtn' | 'airtel' | 'zamtel'); setError(''); }}
                                className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25 outline-none text-base transition-all"
                            >
                                <option value="mtn">MTN</option>
                                <option value="airtel">Airtel</option>
                                <option value="zamtel">Zamtel</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Mobile Number</label>
                            <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 focus-within:ring-2 focus-within:ring-teal-500/25 focus-within:border-teal-500">
                                <span className="inline-flex items-center px-4 py-3 text-slate-500 bg-slate-50 border-r border-slate-200 text-base font-medium">+260</span>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => { setPhone(e.target.value); setError(''); }}
                                    className="flex-1 px-4 py-3.5 min-h-[48px] border-0 bg-transparent focus:ring-0 focus:outline-none text-base placeholder:text-slate-400"
                                    placeholder="97 123 4567"
                                    inputMode="tel"
                                    required
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Zambian number for payout</p>
                        </div>
                        </div>

                        <Message variant="info" title="How it works">
                            We&apos;ll convert your crypto to ZMW and send it straight to your mobile money. Funds usually arrive within a few minutes.
                        </Message>

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
