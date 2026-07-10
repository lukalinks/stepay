'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { dash } from '@/lib/dashboard-ui';

export default function PayRequestPage() {
    const params = useParams();
    const router = useRouter();
    const token = String(params.token ?? '');
    const [info, setInfo] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/request-money/${token}`)
            .then((r) => r.json())
            .then(setInfo)
            .finally(() => setLoading(false));
    }, [token]);

    const payHref = `/dashboard/send?request=${token}&amount=${info?.amount ?? ''}&asset=${info?.asset ?? 'usdc'}&phone=${encodeURIComponent(String(info?.requesterPhone ?? ''))}`;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: BRAND.bg, color: '#fff' }}>
            <Logo size="md" variant="dark" className="mb-8" />
            <div className={`w-full max-w-md ${dash.panel} ${dash.panelPadding}`}>
                {loading ? (
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--brand-accent)]" />
                ) : info?.error ? (
                    <p className="text-center text-white/50">{String(info.error)}</p>
                ) : (
                    <>
                        <h1 className="text-xl font-bold mb-2">Payment request</h1>
                        <p className="text-white/50 text-sm mb-4">
                            {String(info?.requesterName ?? 'Someone')} requested
                        </p>
                        <p className="text-3xl font-bold text-[var(--brand-accent)] mb-2">
                            {Number(info?.amount)} {String(info?.asset).toUpperCase()}
                        </p>
                        {info?.note ? <p className="text-sm text-white/45 mb-6">&quot;{String(info.note)}&quot;</p> : null}
                        <Link
                            href={`/login?next=${encodeURIComponent(payHref)}`}
                            className={`${dash.ctaFull} mb-3`}
                            onClick={(e) => {
                                e.preventDefault();
                                router.push(`/login?next=${encodeURIComponent(payHref)}`);
                            }}
                        >
                            <Send className="h-5 w-5" /> Sign in to pay
                        </Link>
                        <Link href={`/signup?next=${encodeURIComponent(payHref)}`} className={`${dash.ctaSecondary} block text-center`}>
                            Create account
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
