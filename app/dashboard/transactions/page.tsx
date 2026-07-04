'use client';

import Link from 'next/link';
import { ArrowDownLeft, Loader2, Send, History } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { TransactionRow } from '@/components/dashboard/TransactionRow';
import { dash } from '@/lib/dashboard-ui';

export default function TransactionsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchData = useCallback(() => {
        fetch('/api/transactions')
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

    const hasPending = data?.transactions?.some((tx: { status: string }) => tx.status === 'PENDING');
    useEffect(() => {
        if (!hasPending) return;
        const id = setInterval(fetchData, 10000);
        return () => clearInterval(id);
    }, [hasPending, fetchData]);

    if (loading) {
        return (
            <div className="flex min-h-[280px] items-center justify-center">
                <Loader2 className={dash.spinner} />
            </div>
        );
    }

    if (!data || data.error) {
        return (
            <div className={dash.errorPanel}>
                <p className="mb-4 text-white/55">{data?.error || 'Unable to load transactions.'}</p>
                <button type="button" onClick={() => (data?.error ? router.push('/login') : window.location.reload())} className={dash.cta}>
                    {data?.error ? 'Sign in' : 'Retry'}
                </button>
            </div>
        );
    }

    const transactions = data.transactions ?? [];

    return (
        <div className={dash.pageWrap}>
        <DashboardCard
            title="All transactions"
            subtitle={`${transactions.length} total`}
            action={
                <button type="button" onClick={fetchData} className={dash.ctaGhost}>
                    Refresh
                </button>
            }
            noPadding
        >
            {transactions.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-16 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.05]">
                        <History className="h-8 w-8 text-white/30" />
                    </div>
                    <p className="font-medium text-white/80">No transactions yet</p>
                    <p className="mt-1 text-sm text-white/40">Deposits, cash outs, and sends appear here.</p>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <Link href="/dashboard/buy" className={dash.cta}>
                            <ArrowDownLeft className="h-4 w-4" />
                            Deposit
                        </Link>
                        <Link href="/dashboard/send" className={dash.ctaSecondary}>
                            <Send className="h-4 w-4" />
                            Send
                        </Link>
                    </div>
                </div>
            ) : (
                transactions.map((tx: any) => <TransactionRow key={tx.id} tx={tx} />)
            )}
        </DashboardCard>
        </div>
    );
}
