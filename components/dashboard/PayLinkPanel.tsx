'use client';

import { useEffect, useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import { PayQrCode } from '@/components/dashboard/PayQrCode';
import { whatsAppShareUrl } from '@/lib/share';
import { dash } from '@/lib/dashboard-ui';

export function PayLinkPanel() {
    const [link, setLink] = useState<{ payUrl: string; label: string | null; slug: string } | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetch('/api/user/pay-link')
            .then((r) => r.json())
            .then((d) => { if (d.payUrl) setLink(d); })
            .catch(() => {});
    }, []);

    if (!link) return null;

    const copy = async () => {
        await navigator.clipboard.writeText(link.payUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-white/50">
                Share your QR or link so anyone can pay you on Stepay — great for shops, taxis, or freelancers.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <PayQrCode value={link.payUrl} size={160} />
                <div className="flex-1 w-full space-y-3">
                    <p className={`${dash.sectionLabel}`}>{link.label ?? 'Your pay link'}</p>
                    <code className="block break-all text-xs text-white/70 font-mono">{link.payUrl}</code>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={copy} className={dash.ctaSecondary}>
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copied ? 'Copied' : 'Copy link'}
                        </button>
                        <a
                            href={whatsAppShareUrl(`Pay me on Stepay: ${link.payUrl}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={dash.ctaSecondary}
                        >
                            <Share2 className="h-4 w-4" /> WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
