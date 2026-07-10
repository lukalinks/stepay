'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, Loader2, Gift } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { dash } from '@/lib/dashboard-ui';

export default function ClaimPage() {
    const params = useParams();
    const router = useRouter();
    const token = String(params.token ?? '');
    const [info, setInfo] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    useEffect(() => {
        fetch(`/api/claim/${token}`)
            .then((r) => r.json())
            .then((d) => {
                if (d.error) setError(d.error);
                else setInfo(d);
            })
            .catch(() => setError('Failed to load transfer'))
            .finally(() => setLoading(false));
    }, [token]);

    const handleClaim = async () => {
        setClaiming(true);
        setError('');
        const res = await fetch(`/api/claim/${token}`, { method: 'POST' });
        const data = await res.json();
        if (res.status === 401) {
            router.push(`/login?next=${encodeURIComponent(`/claim/${token}`)}`);
            return;
        }
        if (!res.ok) {
            setError(data.error || 'Claim failed');
            setClaiming(false);
            return;
        }
        setDone(true);
        setClaiming(false);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: BRAND.bg, color: '#fff' }}>
            <Logo size="md" variant="dark" className="mb-8" />
            <div className={`w-full max-w-md ${dash.panel} ${dash.panelPadding}`}>
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-accent)]" />
                    </div>
                ) : done ? (
                    <div className="text-center py-6">
                        <CheckCircle className="mx-auto h-12 w-12 text-[var(--brand-accent)] mb-4" />
                        <h1 className="text-xl font-bold mb-2">Claimed!</h1>
                        <p className="text-white/50 text-sm mb-6">The money is in your Stepay wallet.</p>
                        <Link href="/dashboard" className={dash.cta}>Open wallet</Link>
                    </div>
                ) : info ? (
                    <>
                        <div className="flex items-center gap-3 mb-6">
                            <Gift className="h-8 w-8 text-[var(--brand-accent)]" />
                            <div>
                                <h1 className="text-lg font-bold">You received money</h1>
                                <p className="text-sm text-white/50">
                                    From {String(info.senderName ?? 'someone on Stepay')}
                                </p>
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-[var(--brand-accent)] mb-1">
                            {Number(info.amount)} {String(info.asset).toUpperCase()}
                        </p>
                        <p className="text-sm text-white/45 mb-6">Sent to {String(info.recipientPhone)}</p>
                        {Boolean(info.expired) || info.status !== 'pending' ? (
                            <p className="text-red-400 text-sm">This transfer is no longer available.</p>
                        ) : (
                            <>
                                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                                <button type="button" onClick={handleClaim} disabled={claiming} className={dash.ctaFull}>
                                    {claiming ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                                    {claiming ? 'Claiming…' : 'Sign in & claim'}
                                </button>
                                <p className="text-xs text-white/35 mt-4 text-center">
                                    New to Stepay?{' '}
                                    <Link href={`/signup?next=${encodeURIComponent(`/claim/${token}`)}`} className={dash.accentLink}>
                                        Create a free account
                                    </Link>
                                </p>
                            </>
                        )}
                    </>
                ) : (
                    <p className="text-center text-white/50 py-8">{error || 'Transfer not found'}</p>
                )}
            </div>
        </div>
    );
}
