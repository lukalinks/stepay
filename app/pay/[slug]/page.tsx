'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { PayQrCode } from '@/components/dashboard/PayQrCode';
import { whatsAppShareUrl } from '@/lib/share';
import { BRAND } from '@/lib/brand';
import { dash } from '@/lib/dashboard-ui';

export default function PayLinkPage() {
    const params = useParams();
    const slug = String(params.slug ?? '');
    const [info, setInfo] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/pay/${slug}`)
            .then((r) => r.json())
            .then(setInfo)
            .finally(() => setLoading(false));
    }, [slug]);

    const payUrl = typeof window !== 'undefined' ? window.location.href : '';
    const amount = info?.amount != null ? Number(info.amount) : null;
    const sendHref = `/dashboard/send?pay=${slug}${amount ? `&amount=${amount}` : ''}&asset=${info?.asset ?? 'usdc'}`;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: BRAND.bg, color: '#fff' }}>
            <Logo size="md" variant="dark" className="mb-8" />
            <div className={`w-full max-w-md ${dash.panel} ${dash.panelPadding} text-center`}>
                {loading ? (
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--brand-accent)]" />
                ) : info?.error ? (
                    <p className="text-white/50">{String(info.error)}</p>
                ) : (
                    <>
                        <h1 className="text-xl font-bold">{String(info?.label ?? 'Pay on Stepay')}</h1>
                        <p className="text-white/50 text-sm mt-1 mb-4">{String(info?.recipientName ?? '')}</p>
                        {amount != null && amount > 0 && (
                            <p className="text-2xl font-bold text-[var(--brand-accent)] mb-4">
                                {amount} {String(info?.asset).toUpperCase()}
                            </p>
                        )}
                        {!loading && payUrl && (
                            <div className="flex justify-center mb-6">
                                <PayQrCode value={payUrl} size={180} />
                            </div>
                        )}
                        <Link href={`/login?next=${encodeURIComponent(sendHref)}`} className={`${dash.ctaFull} mb-3`}>
                            <Send className="h-5 w-5" /> Pay with Stepay
                        </Link>
                        <a
                            href={whatsAppShareUrl(`Pay ${info?.recipientName} on Stepay: ${payUrl}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${dash.ctaSecondary} inline-flex`}
                        >
                            Share on WhatsApp
                        </a>
                    </>
                )}
            </div>
        </div>
    );
}
