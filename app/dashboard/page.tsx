'use client';

import Link from 'next/link';
import { ArrowUpRight, ArrowDownLeft, Wallet, Loader2, Send, ChevronDown, ChevronUp, ExternalLink, Copy } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DepositModal } from '@/components/DepositModal';

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
        BUY: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/50',
        SEND: 'bg-violet-100 text-violet-700 ring-1 ring-violet-200/50',
        SELL: 'bg-teal-100 text-teal-700 ring-1 ring-teal-200/50',
    };
    const amountColor = tx.type === 'BUY' ? 'text-emerald-600' : tx.type === 'SEND' ? 'text-violet-600' : 'text-teal-600';
    const statusStyles = tx.status === 'COMPLETED' ? 'text-emerald-600' : tx.status === 'FAILED' ? 'text-red-500' : 'text-amber-600';

    return (
        <div className="border-b border-slate-200/60 last:border-b-0">
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full px-5 py-4 flex justify-between items-center gap-3 hover:bg-slate-50/80 active:bg-slate-50 min-h-[76px] text-left transition-colors rounded-lg mx-1 my-0.5"
            >
                <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl shrink-0 ${typeStyles[tx.type as keyof typeof typeStyles] || typeStyles.SELL}`}>
                        {tx.type === 'BUY' ? <ArrowDownLeft className="w-5 h-5" /> : tx.type === 'SEND' ? <Send className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                        <p className="font-semibold text-slate-900 text-[15px]">
                            {typeLabel} {formatCryptoAmount(tx.amountXLM, tx.asset)} {assetLabel}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className={`font-bold text-[15px] ${amountColor}`}>
                            {tx.type === 'BUY' ? '+' : '-'}{formatCryptoAmount(tx.amountXLM, tx.asset)} {assetLabel}
                        </p>
                        <p className={`text-xs font-medium mt-0.5 ${statusStyles}`}>{formatStatus(tx.status, tx.type)}</p>
                    </div>
                    {expanded ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
                </div>
            </button>
            {expanded && (
                <div className="px-5 pb-5 pt-2 space-y-3 bg-slate-50/80 mx-1 mb-1 rounded-b-xl">
                    <div className="grid gap-3 text-sm">
                        <div className="flex justify-between gap-4 py-1.5">
                            <span className="text-slate-500">Amount (ZMW)</span>
                            <span className="font-semibold text-slate-800">ZMW {Number(tx.amountFiat).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between gap-4 items-center py-1.5">
                            <span className="text-slate-500">Reference</span>
                            <code className="font-mono text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 truncate max-w-[180px]" title={tx.reference}>{tx.reference}</code>
                        </div>
                        {tx.depositMemo && (
                            <div className="flex justify-between gap-4 items-center py-1.5">
                                <span className="text-slate-500">Memo</span>
                                <code className="font-mono text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">{tx.depositMemo}</code>
                            </div>
                        )}
                        <div className="flex justify-between gap-4 items-center flex-wrap py-1.5">
                            <span className="text-slate-500">Blockchain Hash</span>
                            {tx.txHash ? (
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                    <code className="font-mono text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 break-all max-w-full" title={tx.txHash}>
                                        {tx.txHash.slice(0, 12)}...{tx.txHash.slice(-8)}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); copyHash(); }}
                                        className="p-2 rounded-lg hover:bg-slate-200 active:bg-slate-300 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors border border-slate-200"
                                        title="Copy hash"
                                    >
                                        <Copy className="w-4 h-4 text-slate-600" />
                                    </button>
                                    <a
                                        href={`https://stellar.expert/explorer/public/tx/${tx.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2 rounded-lg hover:bg-teal-50 border border-slate-200 min-h-[36px] min-w-[36px] flex items-center justify-center text-teal-600 transition-colors"
                                        title="View on Stellar Explorer"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            ) : (
                                <span className="text-slate-400 text-xs">—</span>
                            )}
                        </div>
                        <div className="flex justify-between gap-4 py-1.5">
                            <span className="text-slate-500">Date</span>
                            <span className="font-medium text-slate-700">{new Date(tx.createdAt).toLocaleString()}</span>
                        </div>
                    </div>
                    {copied && <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">Hash copied!</p>}
                </div>
            )}
        </div>
    );
}

export default function DashboardPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [depositModalOpen, setDepositModalOpen] = useState(false);
    const [slideIndex, setSlideIndex] = useState(0);
    const sliderRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const totalSlides = 3;

    const handleSlideScroll = useCallback(() => {
        const el = sliderRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth } = el;
        const maxScroll = scrollWidth - el.offsetWidth;
        if (maxScroll <= 0) return;
        const progress = scrollLeft / maxScroll;
        const index = Math.round(progress * (totalSlides - 1));
        setSlideIndex(Math.min(Math.max(0, index), totalSlides - 1));
    }, []);

    const goToSlide = useCallback((index: number) => {
        const el = sliderRef.current;
        if (!el) return;
        const maxScroll = el.scrollWidth - el.offsetWidth;
        if (maxScroll <= 0) return;
        const target = (index / (totalSlides - 1)) * maxScroll;
        el.scrollTo({ left: target, behavior: 'smooth' });
    }, []);

    const fetchData = useCallback(() => {
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

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const hasPendingDeposits = data?.transactions?.some((tx: { type: string; status: string }) => tx.type === 'BUY' && tx.status === 'PENDING');
    useEffect(() => {
        if (!hasPendingDeposits) return;
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [hasPendingDeposits, fetchData]);

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
                <p className="text-slate-600 mb-4">We couldn't load your dashboard right now.</p>
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

    const walletAddr = data.user?.walletPublic || data.user?.wallet_public || '';

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col gap-4">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-slate-900 font-semibold text-base sm:text-lg">Welcome back, {data.user?.email || data.user?.phone || 'there'}</p>
                        {data.user?.role === 'admin' && (
                            <Link href="/admin" className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                                Admin →
                            </Link>
                        )}
                    </div>
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
                        <p className="text-sm text-amber-700">Your wallet is still being set up. If this persists, please contact support.</p>
                    )}
                </div>
            </div>

            {/* Balance Cards Slider */}
            <div className="-mx-4 sm:mx-0">
                <div
                    ref={sliderRef}
                    onScroll={handleSlideScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-4 sm:gap-5 px-4 sm:px-0 pb-2 snap-center [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    style={{ scrollSnapType: 'x mandatory' }}
                >
                    {/* XLM Card */}
                    <div className="flex-shrink-0 w-[280px] sm:w-[240px] lg:w-[220px] min-w-0 snap-center">
                        <div className="bg-gradient-to-br from-teal-500 via-teal-600 to-teal-800 rounded-2xl p-5 text-white shadow-xl shadow-teal-500/25 ring-1 ring-white/10 relative overflow-hidden min-h-[150px] hover:shadow-teal-500/30 transition-shadow">
                            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
                            <div className="absolute right-2 top-2 h-12 w-12 rounded-full bg-white/5" />
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-bold tracking-widest uppercase text-white/80">XLM</span>
                                    <div className="p-1.5 rounded-lg bg-white/15">
                                        <Wallet className="w-4 h-4" />
                                    </div>
                                </div>
                                <p className="text-white/70 text-xs font-medium mb-0.5">Balance</p>
                                <p className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">{Number(data.balance.xlm).toLocaleString()} XLM</p>
                                <p className="mt-2 text-xs text-white/70 font-medium">≈ ZMW {data.balance.xlmZmwEquiv}</p>
                            </div>
                        </div>
                    </div>

                    {/* USDC Card */}
                    <div className="flex-shrink-0 w-[280px] sm:w-[240px] lg:w-[220px] min-w-0 snap-center">
                        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 rounded-2xl p-5 text-white shadow-xl shadow-emerald-500/25 ring-1 ring-white/10 relative overflow-hidden min-h-[150px] hover:shadow-emerald-500/30 transition-shadow">
                            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
                            <div className="absolute right-2 top-2 h-12 w-12 rounded-full bg-white/5" />
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-bold tracking-widest uppercase text-white/80">USDC</span>
                                    <div className="p-1.5 rounded-lg bg-white/15">
                                        <Wallet className="w-4 h-4" />
                                    </div>
                                </div>
                                <p className="text-white/70 text-xs font-medium mb-0.5">Balance</p>
                                <p className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">{Number(data.balance.usdc || 0).toLocaleString()} USDC</p>
                                <p className="mt-2 text-xs text-white/70 font-medium">≈ ZMW {data.balance.usdcZmwEquiv}</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions Card */}
                    <div className="flex-shrink-0 w-[280px] sm:w-[240px] lg:w-[220px] min-w-0 snap-center">
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 shadow-sm ring-1 ring-slate-900/5 flex flex-col justify-between min-h-[150px] hover:shadow-md transition-shadow">
                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">Quick Actions</h3>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDepositModalOpen(true)}
                                    className="flex flex-col items-center justify-center min-h-[72px] p-3 bg-white border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/80 text-emerald-700 rounded-xl transition-all gap-2 group active:scale-[0.97] shadow-sm"
                                >
                                    <ArrowDownLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span className="font-semibold text-xs">Deposit</span>
                                </button>
                                <Link href="/dashboard/send" className="flex flex-col items-center justify-center min-h-[72px] p-3 bg-white border border-slate-200/80 hover:border-violet-300 hover:bg-violet-50/80 text-violet-700 rounded-xl transition-all gap-2 group active:scale-[0.97] shadow-sm">
                                    <Send className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span className="font-semibold text-xs">Send</span>
                                </Link>
                                <Link href="/dashboard/sell" className="flex flex-col items-center justify-center min-h-[72px] p-3 bg-white border border-slate-200/80 hover:border-teal-300 hover:bg-teal-50/80 text-teal-700 rounded-xl transition-all gap-2 group active:scale-[0.97] shadow-sm">
                                    <ArrowUpRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span className="font-semibold text-xs">Cash Out</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pagination dots */}
                <div className="flex justify-center gap-2 mt-4">
                    {[0, 1, 2].map((i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => goToSlide(i)}
                            className={`h-2 rounded-full transition-all duration-300 ${
                                slideIndex === i ? 'w-7 bg-teal-500 shadow-sm' : 'w-2 bg-slate-300 hover:bg-slate-400'
                            }`}
                            aria-label={`Go to slide ${i + 1}`}
                        />
                    ))}
                </div>
            </div>

            {/* Recent Transactions Preview */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm ring-1 ring-slate-900/5 overflow-hidden">
                <div className="px-5 sm:px-6 py-4 border-b border-slate-200/60 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="font-bold text-slate-900 text-base sm:text-lg">Recent Transactions</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Deposits, cash outs, and sends</p>
                    </div>
                    <Link href="/dashboard/transactions" className="text-sm text-teal-600 hover:text-teal-700 font-semibold py-2.5 px-4 rounded-xl hover:bg-teal-50 transition-colors min-h-[44px] flex items-center">
                        View all →
                    </Link>
                </div>
                <div>
                    {data.transactions.length === 0 ? (
                        <div className="p-10 sm:p-14 text-center">
                            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <Wallet className="w-7 h-7 text-slate-400" />
                            </div>
                            <p className="text-slate-700 font-medium mb-1">No transactions yet</p>
                            <p className="text-slate-500 text-sm mb-6">Deposit, cash out, or send to see your activity here.</p>
                            <button
                                type="button"
                                onClick={() => setDepositModalOpen(true)}
                                className="text-teal-600 hover:text-teal-700 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-teal-50 transition-colors"
                            >
                                Make your first deposit →
                            </button>
                        </div>
                    ) : (
                        data.transactions.slice(0, 3).map((tx: any) => (
                            <TransactionRow key={tx.id} tx={tx} />
                        ))
                    )}
                </div>
                {data.transactions.length > 3 && (
                    <div className="px-5 py-4 border-t border-slate-200/60 text-center bg-slate-50/30">
                        <Link href="/dashboard/transactions" className="inline-block text-teal-600 hover:text-teal-700 font-semibold text-sm py-2 px-4 rounded-xl hover:bg-teal-50 transition-colors">
                            View all {data.transactions.length} transactions
                        </Link>
                    </div>
                )}
            </div>

            <DepositModal
                isOpen={depositModalOpen}
                onClose={() => setDepositModalOpen(false)}
                onSuccess={fetchData}
            />
        </div>
    );
}
