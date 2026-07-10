'use client';

import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { QuickActionsBar } from '@/components/dashboard/QuickActionsBar';
import { TransactionRow } from '@/components/dashboard/TransactionRow';
import { WalletOverview } from '@/components/dashboard/WalletOverview';
import { dash } from '@/lib/dashboard-ui';

function computeTodayChange(
    transactions: { type: string; status: string; amountFiat: number; createdAt: string }[],
    portfolioZmw: number
) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let net = 0;
    for (const tx of transactions) {
        if (tx.status !== 'COMPLETED') continue;
        if (new Date(tx.createdAt) < today) continue;
        const fiat = Number(tx.amountFiat) || 0;
        if (tx.type === 'BUY') net += fiat;
        else if (tx.type === 'SELL') net -= fiat;
    }
    if (net === 0 || portfolioZmw <= 0) return null;
    const base = portfolioZmw - net;
    return { percent: base > 0 ? (net / base) * 100 : 0, amount: net };
}

export default function DashboardPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchData = useCallback(() => {
        fetch('/api/user')
            .then((res) => {
                if (res.status === 401) {
                    router.push('/login');
                    throw new Error('Unauthorized');
                }
                return res.json();
            })
            .then((json) => setData(json?.error ? { error: json.error } : json))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [router]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const hasPending = data?.transactions?.some(
        (tx: { type: string; status: string }) => tx.type === 'BUY' && tx.status === 'PENDING'
    );

    const confirmPendingDeposits = useCallback(() => {
        fetch('/api/deposit/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
                if (json?.completed > 0) fetchData();
            })
            .catch(() => {});
    }, [fetchData]);

    useEffect(() => {
        if (!hasPending) return;
        confirmPendingDeposits();
        const id = setInterval(confirmPendingDeposits, 10000);
        return () => clearInterval(id);
    }, [hasPending, confirmPendingDeposits]);

    if (loading) {
        return (
            <div className={dash.sectionGap}>
                <div className={`h-[360px] ${dash.skeleton}`} />
            </div>
        );
    }

    if (!data || data.error) {
        return (
            <div className={dash.errorPanel}>
                <p className="text-white/55 mb-4">{data?.error || 'Unable to load your wallet.'}</p>
                <button
                    type="button"
                    onClick={() => (data?.error ? router.push('/login') : window.location.reload())}
                    className={dash.cta}
                >
                    {data?.error ? 'Sign in' : 'Retry'}
                </button>
            </div>
        );
    }

    const walletAddr = data.user?.walletPublic || data.user?.wallet_public || '';
    const localCurrency = data.user?.currency ?? 'ZMW';
    const portfolio =
        Number(data.balance.xlmLocalEquiv ?? data.balance.xlmZmwEquiv ?? 0) +
        Number(data.balance.usdcLocalEquiv ?? data.balance.usdcZmwEquiv ?? 0);
    const todayChange = computeTodayChange(data.transactions ?? [], portfolio);

    return (
        <div className={dash.pageWrap}>
            <div className={dash.sectionGap}>
            <div className={`${dash.panel} overflow-hidden`}>
                <div className="grid lg:grid-cols-[1fr_260px]">
                    <WalletOverview
                        portfolioLocal={portfolio.toFixed(2)}
                        localCurrency={localCurrency}
                        walletAddr={walletAddr}
                        balance={data.balance}
                        todayChange={todayChange}
                    />
                    <QuickActionsBar
                        variant="responsive"
                        className={`${dash.panelPadding} border-t border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent lg:border-t-0 lg:border-l`}
                    />
                </div>
            </div>

            <DashboardCard
                title="Recent activity"
                subtitle="Latest deposits, cash outs, and sends"
                action={
                    <Link href="/dashboard/transactions" className={dash.ctaGhost}>
                        View all
                    </Link>
                }
                noPadding
            >
                {data.transactions.length === 0 ? (
                    <div className="py-10 text-center px-6">
                        <div className={dash.emptyIcon}>
                            <Wallet className="h-6 w-6 text-[var(--brand-accent)]/50" />
                        </div>
                        <p className="text-white/80 font-semibold text-sm">No activity yet</p>
                        <p className="text-white/40 text-xs mt-1.5 max-w-xs mx-auto">Deposit mobile money or send crypto — transactions appear here instantly.</p>
                        <Link href="/dashboard/buy" className={`mt-5 inline-flex ${dash.cta}`}>
                            Make a deposit
                        </Link>
                    </div>
                ) : (
                    data.transactions.slice(0, 4).map((tx: any) => (
                        <TransactionRow key={tx.id} tx={tx} />
                    ))
                )}
            </DashboardCard>
            </div>
        </div>
    );
}
