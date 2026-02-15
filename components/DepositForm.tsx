'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowDownLeft, Loader2, Check, Smartphone, Wallet } from 'lucide-react';
import { Message } from '@/components/Message';

function toFriendlyDepositError(msg?: string): string {
    if (!msg) return 'Something went wrong. Please try again in a moment.';
    const m = msg.toLowerCase();
    if (m.includes('minimum')) return msg;
    if (m.includes('maximum')) return msg;
    if (m.includes('mobile') || m.includes('phone') || m.includes('number')) return msg;
    if (m.includes('unauthorized') || m.includes('sign in')) return 'Please sign in again to continue.';
    if (m.includes('collection') || m.includes('lenco') || m.includes('mobile money')) return 'We couldn\'t send the payment request to your phone. Please check your number and try again.';
    return msg;
}

const DEFAULT_RATES = { xlm: { buy: 3.5 }, usdc: { buy: 25 } } as const;

type DepositStep = 'request_sent' | 'approve_phone' | 'complete';

interface DepositFormProps {
    /** Called after successful deposit - use to close modal, refresh, etc. */
    onSuccess?: () => void;
    /** Compact mode for modal - less padding */
    compact?: boolean;
}

export function DepositForm({ onSuccess, compact }: DepositFormProps) {
    const [asset, setAsset] = useState<'xlm' | 'usdc'>('xlm');
    const [amount, setAmount] = useState('');
    const [phone, setPhone] = useState('');
    const [operator, setOperator] = useState<'mtn' | 'airtel' | 'zamtel'>('mtn');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [lastReference, setLastReference] = useState('');
    const [depositStep, setDepositStep] = useState<DepositStep>('request_sent');
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [rates, setRates] = useState<{ xlm: { buy: number }; usdc: { buy: number } }>(DEFAULT_RATES);
    const [limits, setLimits] = useState({ minDepositZmw: 4, maxDepositZmw: 50000 });

    const rate = rates[asset].buy;
    const minZmw = limits.minDepositZmw;
    const maxZmw = limits.maxDepositZmw;

    useEffect(() => {
        fetch('/api/rates')
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
                if (data?.rates) setRates(data.rates);
                if (data?.limits) setLimits(data.limits);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetch('/api/user')
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
                if (data?.user?.phone_number) setPhone(data.user.phone_number);
                if (data?.user?.preferred_operator && ['mtn', 'airtel', 'zamtel'].includes(data.user.preferred_operator)) {
                    setOperator(data.user.preferred_operator);
                }
            })
            .catch(() => {});
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = Number(amount);
        const phoneDigits = phone.replace(/\s+/g, '').replace(/^0/, '').replace(/\D/g, '');
        if (!amount || amountNum < minZmw) {
            setErrorMessage(`Please enter at least ${minZmw} ZMW to deposit. Small deposits help us keep fees low for everyone.`);
            setStatus('error');
            return;
        }
        if (amountNum > maxZmw) {
            setErrorMessage(`Deposits are limited to ${maxZmw} ZMW per transaction. You can make multiple deposits if needed.`);
            setStatus('error');
            return;
        }
        if (phoneDigits.length < 10) {
            setErrorMessage('Please enter your full Zambian mobile number (e.g. 0971234567) so we can send you the payment request.');
            setStatus('error');
            return;
        }
        setIsLoading(true);
        setErrorMessage('');
        setStatus('idle');

        try {
            const res = await fetch('/api/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amountNum, phone: phone.trim(), operator, asset }),
            });

            const data = await res.json();

            if (res.ok && data.success !== false) {
                setStatus('success');
                setLastReference(data.reference || '');
                setDepositStep('request_sent');
                onSuccess?.();
            } else {
                setErrorMessage(toFriendlyDepositError(data.error));
                setStatus('error');
            }
        } catch (error) {
            setErrorMessage('We couldn\'t reach our servers. Please check your internet connection and try again.');
            setStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = () => { setErrorMessage(''); setStatus('idle'); };
    const resetForm = () => {
        setStatus('idle');
        setLastReference('');
        setDepositStep('request_sent');
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    };

    useEffect(() => {
        if (status !== 'success' || !lastReference) return;
        const checkStatus = () => {
            fetch('/api/user')
                .then((res) => (res.ok ? res.json() : null))
                .then((data) => {
                    const tx = data?.transactions?.find((t: { reference: string }) => t.reference === lastReference);
                    if (tx?.status === 'COMPLETED') {
                        setDepositStep('complete');
                        if (pollIntervalRef.current) {
                            clearInterval(pollIntervalRef.current);
                            pollIntervalRef.current = null;
                        }
                        onSuccess?.();
                    }
                })
                .catch(() => {});
        };
        pollIntervalRef.current = setInterval(checkStatus, 3000);
        checkStatus();
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [status, lastReference, onSuccess]);

    const paddingClass = compact ? 'p-4 sm:p-5' : 'p-4 sm:p-6 md:p-8';

    const steps = [
        { key: 'request_sent' as const, icon: Check, label: 'Request sent to your phone', done: true },
        { key: 'approve_phone' as const, icon: Smartphone, label: 'Approve payment on your phone', done: depositStep === 'complete', current: depositStep !== 'complete' },
        { key: 'complete' as const, icon: Wallet, label: `${asset.toUpperCase()} sent to your wallet`, done: depositStep === 'complete', current: depositStep === 'complete' },
    ];

    return (
        <div className={paddingClass}>
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
                <div className="p-2.5 sm:p-3 bg-emerald-100 rounded-2xl text-emerald-600">
                    <ArrowDownLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-heading">Deposit</h2>
            </div>

            {status === 'success' ? (
                <div className="py-4 sm:py-6">
                    <h3 className="text-lg font-bold font-heading mb-4">Deposit Status</h3>
                    <div className="space-y-4 mb-6">
                        {steps.map((step, i) => {
                            const Icon = step.icon;
                            const isDone = step.done;
                            const isCurrent = step.current && !isDone;
                            return (
                                <div
                                    key={step.key}
                                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                                        isDone ? 'bg-emerald-50/80 border-emerald-200' : isCurrent ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                                    }`}
                                >
                                    <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                                        isDone ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-amber-500 text-white' : 'bg-slate-300 text-slate-600'
                                    }`}>
                                        {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-medium text-sm ${isDone ? 'text-emerald-800' : isCurrent ? 'text-amber-800' : 'text-slate-600'}`}>
                                            {step.label}
                                        </p>
                                        {isCurrent && step.key === 'approve_phone' && (
                                            <p className="text-xs text-amber-700 mt-1">You'll receive a prompt on your phone—approve it to complete your deposit.</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {lastReference && (
                        <p className="text-xs text-slate-400 font-mono mb-4">Ref: {lastReference}</p>
                    )}
                    <button
                        type="button"
                        onClick={resetForm}
                        className="w-full min-h-[48px] py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-semibold transition-colors"
                    >
                        Deposit More
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                        {errorMessage && (
                            <Message variant="warning" title="Let's fix that">
                                {errorMessage}
                            </Message>
                        )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Asset</label>
                        <select
                            value={asset}
                            onChange={(e) => { setAsset(e.target.value as 'xlm' | 'usdc'); clearError(); }}
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
                                onChange={(e) => { setAmount(e.target.value); clearError(); }}
                                className="w-full pl-16 pr-4 py-3 min-h-[48px] rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-base sm:text-lg font-semibold transition-all"
                                placeholder="0.00"
                                min={minZmw}
                                max={maxZmw}
                                step="0.01"
                                required
                            />
                        </div>
                        <p className="text-sm text-slate-500 mt-2">
                            You'll get ~{(Number(amount || 0) / rate).toFixed(2)} {asset.toUpperCase()}. Deposits: {minZmw} – {maxZmw} ZMW per transaction
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Mobile Network</label>
                        <select
                            value={operator}
                            onChange={(e) => { setOperator(e.target.value as 'mtn' | 'airtel' | 'zamtel'); clearError(); }}
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
                            onChange={(e) => { setPhone(e.target.value); clearError(); }}
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
                        className="w-full min-h-[52px] bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                        {isLoading ? 'Processing...' : 'Proceed to Payment'}
                    </button>
                </form>
            )}
        </div>
    );
}
