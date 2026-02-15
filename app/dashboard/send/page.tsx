'use client';

import { useState } from 'react';
import { Send, Loader2, CheckCircle } from 'lucide-react';
import { Message } from '@/components/Message';

function toFriendlySendError(msg?: string): string {
    if (!msg || msg.toLowerCase().includes('server')) return 'Something went wrong. Please try again in a moment.';
    const m = msg.toLowerCase();
    if (m.includes('insufficient') || m.includes('balance')) return msg;
    if (m.includes('invalid') && m.includes('address')) return 'Please check the recipient\'s Stellar address (it should start with G).';
    if (m.includes('not found') || m.includes('destination')) return 'We couldn\'t find that Stellar address. Please double-check it.';
    if (m.includes('memo')) return 'The memo might be invalid. Memos can be up to 28 characters.';
    return msg;
}

export default function SendPage() {
    const [asset, setAsset] = useState<'xlm' | 'usdc'>('xlm');
    const [to, setTo] = useState('');
    const [amount, setAmount] = useState('');
    const [memo, setMemo] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [txHash, setTxHash] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const minAmount = asset === 'usdc' ? 1 : 0.1;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus('idle');
        setErrorMessage('');

        try {
            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum < minAmount) {
                setErrorMessage(`Please enter at least ${minAmount} ${asset.toUpperCase()} to send.`);
                setStatus('error');
                setIsLoading(false);
                return;
            }

            const res = await fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: to.trim(),
                    amount: amountNum,
                    asset,
                    memo: memo.trim() || undefined,
                }),
            });

            let data: { error?: string; txHash?: string } = {};
            try {
                data = await res.json();
            } catch {
                data = { error: res.statusText || 'Server error' };
            }

            if (res.ok) {
                setTxHash(data.txHash || '');
                setStatus('success');
            } else {
                setErrorMessage(toFriendlySendError(data.error));
                setStatus('error');
            }
        } catch (error) {
            setErrorMessage('We couldn\'t reach our servers. Please check your connection and try again.');
            setStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200/60 sm:rounded-br-[1.5rem]">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="p-2.5 sm:p-3 bg-violet-100 rounded-2xl text-violet-600">
                        <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold font-heading">Send Crypto</h2>
                </div>

                {status === 'success' ? (
                    <div className="text-center py-6 sm:py-8">
                        <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold font-heading mb-2">Sent!</h3>
                        <p className="text-slate-500 text-sm mb-4">
                            Your {amount} {asset.toUpperCase()} is on its way to the recipient.
                        </p>
                        {txHash && (
                            <a
                                href={`https://stellar.expert/explorer/public/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-teal-600 hover:text-teal-700 text-xs font-mono break-all transition-colors"
                            >
                                View on Stellar Explorer
                            </a>
                        )}
                        <button
                            onClick={() => { setStatus('idle'); setTo(''); setAmount(''); setMemo(''); }}
                            className="mt-6 w-full min-h-[48px] py-3 bg-slate-100 rounded-xl font-semibold hover:bg-slate-200 active:bg-slate-300 transition-colors"
                        >
                            Send More
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {status === 'error' && errorMessage && (
                            <Message variant="warning" title="Something to fix">
                                {errorMessage}
                            </Message>
                        )}
                        <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Asset</label>
                            <select
                                value={asset}
                                onChange={(e) => setAsset(e.target.value as 'xlm' | 'usdc')}
                                className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 outline-none text-base transition-all"
                            >
                                <option value="xlm">XLM</option>
                                <option value="usdc">USDC</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Amount ({asset.toUpperCase()})</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 outline-none text-base font-semibold transition-all placeholder:text-slate-400"
                                placeholder="0.00"
                                step={asset === 'usdc' ? '0.01' : '0.0000001'}
                                min={minAmount}
                                required
                            />
                            <p className="text-xs text-slate-500">Min {minAmount} {asset.toUpperCase()}</p>
                        </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Recipient Stellar Address</label>
                            <input
                                type="text"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 outline-none text-base font-mono transition-all placeholder:text-slate-400"
                                placeholder="G..."
                                required
                            />
                            <p className="text-xs text-slate-500">Stellar address (starts with G)</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Memo <span className="font-normal text-slate-500">(optional)</span></label>
                            <input
                                type="text"
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 outline-none text-base transition-all placeholder:text-slate-400"
                                placeholder="Up to 28 characters"
                                maxLength={28}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full min-h-[52px] bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/25 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            {isLoading ? 'Sending...' : 'Send'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
