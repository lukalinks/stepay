'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, Send, XCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { PayQrCode } from '@/components/dashboard/PayQrCode';
import { BRAND } from '@/lib/brand';
import { dash } from '@/lib/dashboard-ui';

export default function CheckoutPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const token = String(params.token ?? '');
    const embed = searchParams.get('embed') === '1';
    const [info, setInfo] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/checkout/${token}`)
            .then((r) => r.json())
            .then(setInfo)
            .finally(() => setLoading(false));
    }, [token]);

    const status = String(info?.status ?? '');
    const paid = status === 'paid';
    const expired = status === 'expired';
    const sendHref = `/dashboard/send?checkout=${token}`;
    const loginHref = `/login?next=${encodeURIComponent(sendHref)}`;
    const checkoutUrl = typeof window !== 'undefined' ? window.location.href.replace(/\?embed=1/, '') : '';

    const shell = embed ? '' : 'min-h-screen flex flex-col items-center justify-center p-6';

    return (
        <div className={shell} style={{ background: BRAND.bg, color: '#fff' }}>
            {!embed && <Logo size="md" variant="dark" className="mb-8" />}
            <div className={`w-full max-w-md ${dash.panel} ${dash.panelPadding} text-center`}>
                {loading ? (
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--brand-accent)]" />
                ) : info?.error ? (
                    <p className="text-white/50">{String(info.error)}</p>
                ) : paid ? (
                    <>
                        <CheckCircle className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
                        <h1 className="text-xl font-bold">Payment received</h1>
                        <p className="text-white/50 text-sm mt-2">{String(info?.label)}</p>
                    </>
                ) : expired ? (
                    <>
                        <XCircle className="mx-auto h-12 w-12 text-red-400/80 mb-3" />
                        <h1 className="text-xl font-bold">Link expired</h1>
                        <p className="text-white/50 text-sm mt-2">Ask the merchant for a new payment link.</p>
                    </>
                ) : (
                    <>
                        <p className={dash.sectionLabel}>Pay {String(info?.merchantName ?? 'merchant')}</p>
                        <h1 className="text-xl font-bold mt-1">{String(info?.label ?? 'Payment')}</h1>
                        {info?.description && (
                            <p className="text-white/45 text-sm mt-2">{String(info.description)}</p>
                        )}
                        {info?.referenceId && (
                            <p className="text-xs text-white/35 mt-1 font-mono">Ref: {String(info.referenceId)}</p>
                        )}
                        <p className="text-3xl font-bold text-[var(--brand-accent)] my-5">
                            {Number(info?.amount).toFixed(info?.asset === 'usdc' ? 2 : 4)}{' '}
                            {String(info?.asset).toUpperCase()}
                        </p>
                        {!embed && checkoutUrl && (
                            <div className="flex justify-center mb-5">
                                <PayQrCode value={checkoutUrl} size={160} />
                            </div>
                        )}
                        <Link href={loginHref} className={`${dash.ctaFull} mb-2`}>
                            <Send className="h-5 w-5" /> Pay with Stepay
                        </Link>
                        {info?.cancelUrl && (
                            <a
                                href={String(info.cancelUrl)}
                                className={`${dash.ctaSecondary} inline-flex mt-2`}
                            >
                                Cancel
                            </a>
                        )}
                        <p className={`${dash.hint} mt-4`}>Secure payment via your Stepay dollar wallet</p>
                    </>
                )}
            </div>
        </div>
    );
}
