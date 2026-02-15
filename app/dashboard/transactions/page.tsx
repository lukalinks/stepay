'use client';

import Link from 'next/link';
import { ArrowUpRight, ArrowDownLeft, Loader2, Send, ChevronDown, ChevronUp, ExternalLink, Copy, History } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

function formatStatus(status: string, type?: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'COMPLETED') return 'Completed';
    if (s === 'FAILED') return 'Failed';
    if (s === 'PENDING' && type === 'BUY') return 'Awaiting payment';
    if (s === 'PENDING') return 'Pending';
    return status || 'Pending';
}

function formatCryptoAmount(amount: number, asset: string): string {
    const n = Number(amount) || 0;
    if (asset === 'usdc') return n.toFixed(2);
    if (n >= 1) return parseFloat(n.toFixed(4)).toString();
    if (n >= 0.0001) return parseFloat(n.toFixed(6)).toString();
    return n.toFixed(7);
}

function TransactionRow({ tx }: { tx: { id: string; type: string; asset: string; amountXLM: number; amountFiat: number; status: string; reference: string; txHash: string | null; createdAt: string; depositMemo?: string } }) {
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    const typeLabel = tx.type === 'BUY' ? 'Deposited' : tx.type === 'SEND' ? 'Sent' : 'Cashed Out';
    const assetLabel = tx.asset === 'usdc' ? 'USDC' : 'XLM';

    const copyHash = async () => {
        if (tx.txHash && navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(tx.txHash);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch { /* ignore */ }
        }
    };

    const typeStyles = {
        BUY: 'bg-emerald-100 text-emerald-600',
        SEND: 'bg-violet-100 text-violet-600',
        SELL: 'bg-teal-100 text-teal-600',
    };
    const amountColor = tx.type === 'BUY' ? 'text-emerald-600' : tx.type === 'SEND' ? 'text-violet-600' : 'text-slate-900';

    return (
        <div className="border-b border-slate-100 last:border-b-0">
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full p-4 flex justify-between items-center gap-3 hover:bg-slate-50/80 active:bg-slate-100 min-h-[72px] text-left transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl shrink-0 ${typeStyles[tx.type as keyof typeof typeStyles] || typeStyles.SELL}`}>
                        {tx.type === 'BUY' ? <ArrowDownLeft className="w-5 h-5" /> : tx.type === 'SEND' ? <Send className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                        <p className="font-semibold text-slate-900">
                            {typeLabel} {formatCryptoAmount(tx.amountXLM, tx.asset)} {assetLabel}
                        </p>
                        <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-right">
                        <p className={`font-bold ${amountColor}`}>
                            {tx.type === 'BUY' ? '+' : '-'}{formatCryptoAmount(tx.amountXLM, tx.asset)} {assetLabel}
                        </p>
                        <p className="text-xs text-slate-500">{formatStatus(tx.status, tx.type)}</p>
                    </div>
                    {expanded ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
                </div>
            </button>
            {expanded && (
                <div className="px-4 pb-4 pt-0 space-y-3 bg-slate-50/70 border-t border-slate-100">
                    <div className="grid gap-2 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Amount (ZMW)</span>
                            <span className="font-medium text-slate-800">ZMW {Number(tx.amountFiat).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between gap-4 items-center">
                            <span className="text-slate-500">Reference</span>
                            <code className="font-mono text-xs bg-white px-2 py-1 rounded-lg border border-slate-200 truncate max-w-[160px]" title={tx.reference}>{tx.reference}</code>
                        </div>
                        {tx.depositMemo && (
                            <div className="flex justify-between gap-4 items-center">
                                <span className="text-slate-500">Memo</span>
                                <code className="font-mono text-xs bg-white px-2 py-1 rounded-lg border border-slate-200">{tx.depositMemo}</code>
                            </div>
                        )}
                        <div className="flex justify-between gap-4 items-center flex-wrap">
                            <span className="text-slate-500">Blockchain Hash</span>
                            {tx.txHash ? (
                                <div className="flex items-center gap-1 flex-wrap justify-end">
                                    <code className="font-mono text-xs bg-white px-2 py-1 rounded-lg border border-slate-200 break-all max-w-full" title={tx.txHash}>
                                        {tx.txHash.slice(0, 12)}...{tx.txHash.slice(-8)}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); copyHash(); }}
                                        className="p-1.5 rounded-lg hover:bg-slate-200 active:bg-slate-300 min-h-[32px] min-w-[32px] flex items-center justify-center transition-colors"
                                        title="Copy hash"
                                    >
                                        <Copy className="w-4 h-4 text-slate-600" />
                                    </button>
                                    <a
                                        href={`https://stellar.expert/explorer/public/tx/${tx.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1.5 rounded-lg hover:bg-slate-200 active:bg-slate-300 min-h-[32px] min-w-[32px] flex items-center justify-center text-teal-600 transition-colors"
                                        title="View on Stellar Explorer"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            ) : (
                                <span className="text-slate-400 text-xs">—</span>
                            )}
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Date</span>
                            <span className="text-slate-700">{new Date(tx.createdAt).toLocaleString()}</span>
                        </div>
                    </div>
                    {copied && <p className="text-xs text-emerald-600 font-medium">Hash copied!</p>}
                </div>
            )}
        </div>
    );
}

export default function TransactionsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchData = useCallback(() => {
        fetch('/api/transactions')
            .then(res => {
                if (res.status === 401) {
                    router.push('/login');
                    throw new Error('Unauthorized');
                }
                return res.json();
            })
            .then((json) => {
                if (json?.error) {
                    setData({ error: json.error });
                } else {
                    setData(json);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const hasPending = data?.transactions?.some((tx: { status: string }) => tx.status === 'PENDING');
    useEffect(() => {
        if (!hasPending) return;
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [hasPending, fetchData]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[280px]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 text-center shadow-sm">
                <p className="text-slate-600 mb-4">We couldn't load your transactions right now.</p>
                <button onClick={() => window.location.reload()} className="rounded-xl bg-teal-600 px-6 py-2.5 text-white font-medium hover:bg-teal-700 transition-colors">
                    Try again
                </button>
            </div>
        );
    }

    if (data.error) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 text-center shadow-sm">
                <p className="text-amber-800 mb-2 font-medium">Something went wrong</p>
                <p className="text-slate-600 mb-4">{data.error}</p>
                <p className="text-slate-500 text-sm mb-6">Signing in again usually fixes this.</p>
                <button onClick={() => router.push('/login')} className="rounded-xl bg-teal-600 px-6 py-2.5 text-white font-medium hover:bg-teal-700 transition-colors">
                    Sign in again
                </button>
            </div>
        );
    }

    const transactions = data.transactions ?? [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-heading">Transactions</h1>
                <p className="text-slate-500 mt-1 text-sm sm:text-base">View all your deposit, cash out, and send activity.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-slate-200/60 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 font-heading">All Transactions</h3>
                    <button onClick={fetchData} className="text-sm text-teal-600 hover:text-teal-700 font-medium py-2 px-3 -m-2 min-h-[44px] flex items-center transition-colors">
                        Refresh
                    </button>
                </div>
                <div className="divide-y divide-slate-100">
                    {transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-6">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                                <History className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
                            </div>
                            <h4 className="text-lg font-semibold text-slate-800 mb-1">No transactions yet</h4>
                            <p className="text-slate-500 text-sm sm:text-base text-center max-w-sm mb-6">
                                Deposit, cash out, or send crypto to see your activity here.
                            </p>
                            <div className="flex flex-wrap gap-3 justify-center">
                                <Link
                                    href="/dashboard/buy"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors"
                                >
                                    <ArrowDownLeft className="w-4 h-4" />
                                    Deposit
                                </Link>
                                <Link
                                    href="/dashboard/send"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                    Send
                                </Link>
                            </div>
                        </div>
                    ) : (
                        transactions.map((tx: any) => (
                            <TransactionRow key={tx.id} tx={tx} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
