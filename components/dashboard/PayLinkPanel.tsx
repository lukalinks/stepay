'use client';

import { useEffect, useState } from 'react';
import { Copy, Check, Share2, Wallet } from 'lucide-react';
import { PayQrCode } from '@/components/dashboard/PayQrCode';
import { whatsAppShareUrl } from '@/lib/share';
import { dash } from '@/lib/dashboard-ui';

type PayLink = {
    payUrl: string;
    label: string | null;
    slug: string;
    sep7Uri?: string | null;
};

export function PayLinkPanel() {
    const [link, setLink] = useState<PayLink | null>(null);
    const [copied, setCopied] = useState<'url' | 'sep7' | null>(null);
    const [qrMode, setQrMode] = useState<'stepay' | 'stellar'>('stepay');

    useEffect(() => {
        fetch('/api/user/pay-link')
            .then((r) => r.json())
            .then((d) => {
                if (d.payUrl) setLink(d);
            })
            .catch(() => {});
    }, []);

    if (!link) return null;

    const qrValue = qrMode === 'stellar' && link.sep7Uri ? link.sep7Uri : link.payUrl;

    const copy = async (kind: 'url' | 'sep7') => {
        const text = kind === 'sep7' ? link.sep7Uri : link.payUrl;
        if (!text) return;
        await navigator.clipboard.writeText(text);
        setCopied(kind);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-white/50">
                Share your QR or link so anyone can pay you on Stepay — or open a SEP-7 request in a Stellar wallet.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="space-y-2">
                    <PayQrCode value={qrValue} size={160} />
                    {link.sep7Uri && (
                        <div className="flex gap-1 rounded-full border border-white/[0.08] p-0.5 text-[0.6875rem]">
                            <button
                                type="button"
                                onClick={() => setQrMode('stepay')}
                                className={`flex-1 rounded-full px-2 py-1 font-semibold ${
                                    qrMode === 'stepay' ? 'bg-white/10 text-white' : 'text-white/45'
                                }`}
                            >
                                Stepay
                            </button>
                            <button
                                type="button"
                                onClick={() => setQrMode('stellar')}
                                className={`flex-1 rounded-full px-2 py-1 font-semibold ${
                                    qrMode === 'stellar' ? 'bg-white/10 text-white' : 'text-white/45'
                                }`}
                            >
                                Stellar
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex-1 w-full space-y-3">
                    <p className={`${dash.sectionLabel}`}>{link.label ?? 'Your pay link'}</p>
                    <code className="block break-all text-xs text-white/70 font-mono">{link.payUrl}</code>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => copy('url')} className={dash.ctaSecondary}>
                            {copied === 'url' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copied === 'url' ? 'Copied' : 'Copy link'}
                        </button>
                        <a
                            href={whatsAppShareUrl(`Pay me on Stepay: ${link.payUrl}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={dash.ctaSecondary}
                        >
                            <Share2 className="h-4 w-4" /> WhatsApp
                        </a>
                        {link.sep7Uri && (
                            <>
                                <a href={link.sep7Uri} className={dash.ctaSecondary}>
                                    <Wallet className="h-4 w-4" /> Open in Stellar wallet
                                </a>
                                <button type="button" onClick={() => copy('sep7')} className={dash.ctaGhost}>
                                    {copied === 'sep7' ? 'SEP-7 copied' : 'Copy SEP-7 URI'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
