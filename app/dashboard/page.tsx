'use client';

import Link from 'next/link';
import { ArrowUpRight, ArrowDownLeft, Wallet, Loader2, Send, ChevronDown, ChevronUp, ExternalLink, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
                            {typeLabel} {tx.amountXLM} {assetLabel}
                        </p>
                        <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-right">
                        <p className={`font-bold ${amountColor}`}>
                            {tx.type === 'BUY' ? '+' : '-'}{tx.amountXLM} {assetLabel}
                        </p>
                        <p className="text-xs text-slate-500">{tx.status}</p>
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

export default function DashboardPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/user')
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
                <p className="text-slate-600 mb-4">Failed to load dashboard.</p>
                <button onClick={() => window.location.reload()} className="rounded-xl bg-teal-600 px-6 py-2.5 text-white font-medium hover:bg-teal-700 transition-colors">
                    Retry
                </button>
            </div>
        );
    }

    if (data.error) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 text-center shadow-sm">
                <p className="text-red-600 mb-4">{data.error}</p>
                <p className="text-slate-500 text-sm mb-6">Try logging in again.</p>
                <button onClick={() => router.push('/login')} className="rounded-xl bg-teal-600 px-6 py-2.5 text-white font-medium hover:bg-teal-700 transition-colors">
                    Go to Login
                </button>
            </div>
        );
    }

    const walletAddr = data.user?.walletPublic || data.user?.wallet_public || '';

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-heading">Dashboard</h1>
                    <p className="text-slate-500 mt-1 sm:mt-2 text-sm sm:text-base">Welcome back, {data.user?.phone}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Stellar Wallet</p>
                    {walletAddr ? (
                        <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-xs sm:text-sm font-mono text-slate-800 break-all flex-1 min-w-0">
                                {walletAddr.length > 20 ? `${walletAddr.slice(0, 12)}...${walletAddr.slice(-8)}` : walletAddr}
                            </code>
                            <button
                                type="button"
                                onClick={() => navigator.clipboard?.writeText(walletAddr)}
                                className="shrink-0 px-4 py-2.5 min-h-[44px] text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
                            >
                                Copy
                            </button>
                        </div>
                    ) : (
                        <p className="text-sm text-amber-600">No wallet linked. Please contact support.</p>
                    )}
                </div>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                <div className="bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 rounded-2xl p-5 sm:p-6 text-white shadow-lg shadow-teal-500/20 relative overflow-hidden min-h-[140px]">
                    <div className="absolute top-0 right-0 p-3 sm:p-4 opacity-20">
                        <Wallet className="w-16 h-16 sm:w-24 sm:h-24" />
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <span className="bg-white/15 px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide uppercase">XLM</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-teal-200 text-xs sm:text-sm mb-1 font-medium">XLM Balance</p>
                        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">{Number(data.balance.xlm).toLocaleString()} XLM</h2>
                        <p className="text-teal-200/90 mt-1.5 text-sm">≈ ZMW {data.balance.xlmZmwEquiv}</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-2xl p-5 sm:p-6 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden min-h-[140px]">
                    <div className="absolute top-0 right-0 p-3 sm:p-4 opacity-20">
                        <Wallet className="w-16 h-16 sm:w-24 sm:h-24" />
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <span className="bg-white/15 px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide uppercase">USDC</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-emerald-200 text-xs sm:text-sm mb-1 font-medium">USDC Balance</p>
                        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">{Number(data.balance.usdc || 0).toLocaleString()} USDC</h2>
                        <p className="text-emerald-200/90 mt-1.5 text-sm">≈ ZMW {data.balance.usdcZmwEquiv}</p>
                    </div>
                </div>

                <div className="hidden sm:flex bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm flex-col justify-center gap-4 sm:col-span-2 lg:col-span-1">
                    <h3 className="font-semibold text-slate-700 text-sm">Quick Actions</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <Link href="/dashboard/buy" className="flex flex-col items-center justify-center min-h-[76px] sm:min-h-[88px] p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all gap-2 group">
                            <ArrowDownLeft className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            <span className="font-medium text-sm">Deposit</span>
                        </Link>
                        <Link href="/dashboard/sell" className="flex flex-col items-center justify-center min-h-[76px] sm:min-h-[88px] p-3 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl transition-all gap-2 group">
                            <ArrowUpRight className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            <span className="font-medium text-sm">Cash Out</span>
                        </Link>
                        <Link href="/dashboard/send" className="flex flex-col items-center justify-center min-h-[76px] sm:min-h-[88px] p-3 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl transition-all gap-2 group">
                            <Send className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            <span className="font-medium text-sm">Send</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Recent Transactions Preview */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sm:rounded-tr-[1.5rem]">
                <div className="p-4 sm:p-6 border-b border-slate-200/60 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 font-heading">Recent Transactions</h3>
                    <Link href="/dashboard/transactions" className="text-sm text-teal-600 hover:text-teal-700 font-medium py-2 px-3 -m-2 min-h-[44px] flex items-center transition-colors">
                        View all →
                    </Link>
                </div>
                <div className="divide-y divide-slate-100">
                    {data.transactions.length === 0 ? (
                        <div className="p-8 sm:p-12 text-center text-slate-500 text-sm sm:text-base">
                            <p className="mb-2">No transactions yet.</p>
                            <Link href="/dashboard/buy" className="text-teal-600 hover:text-teal-700 font-medium transition-colors">
                                Start depositing →
                            </Link>
                        </div>
                    ) : (
                        data.transactions.slice(0, 3).map((tx: any) => (
                            <TransactionRow key={tx.id} tx={tx} />
                        ))
                    )}
                </div>
                {data.transactions.length > 3 && (
                    <div className="p-4 border-t border-slate-200/60 text-center bg-slate-50/50">
                        <Link href="/dashboard/transactions" className="text-teal-600 hover:text-teal-700 font-medium text-sm transition-colors">
                            View all {data.transactions.length} transactions
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
