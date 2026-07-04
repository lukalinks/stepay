'use client';

import { useCallback, useEffect, useState } from 'react';
import { Code2, Copy, Key, Loader2, Plus, Store, Trash2 } from 'lucide-react';
import { FormError } from '@/components/dashboard/FormError';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';
import { dash } from '@/lib/dashboard-ui';

type ApiKeyRow = {
    id: string;
    name: string;
    prefix: string;
    webhookSecretPreview: string | null;
    revokedAt: string | null;
};

type CheckoutRow = {
    id: string;
    label: string;
    amount: number;
    asset: string;
    status: string;
    checkoutUrl: string;
    embedUrl: string;
    referenceId?: string | null;
    createdAt: string;
};

type CreatedKey = {
    key: string;
    webhookSecret: string;
};

export default function MerchantPage() {
    const [keys, setKeys] = useState<ApiKeyRow[]>([]);
    const [checkouts, setCheckouts] = useState<CheckoutRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
    const [newCheckout, setNewCheckout] = useState({ label: '', amount: '', referenceId: '' });
    const [creatingCheckout, setCreatingCheckout] = useState(false);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [keysRes, coRes] = await Promise.all([
                fetch('/api/merchant/keys'),
                fetch('/api/merchant/checkouts'),
            ]);
            const keysData = await keysRes.json();
            const coData = await coRes.json();
            if (keysRes.ok) setKeys(keysData.keys ?? []);
            if (coRes.ok) setCheckouts(coData.checkouts ?? []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const createKey = async () => {
        setError('');
        const res = await fetch('/api/merchant/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Production' }),
        });
        const data = await res.json();
        if (!res.ok) {
            setError(data.error || 'Failed to create key');
            return;
        }
        setCreatedKey({ key: data.key, webhookSecret: data.webhookSecret });
        load();
    };

    const revokeKey = async (id: string) => {
        await fetch(`/api/merchant/keys/${id}`, { method: 'DELETE' });
        load();
    };

    const createCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingCheckout(true);
        setError('');
        try {
            const res = await fetch('/api/merchant/checkouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    label: newCheckout.label,
                    amount: parseFloat(newCheckout.amount),
                    asset: 'usdc',
                    referenceId: newCheckout.referenceId || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Failed to create checkout');
                return;
            }
            setNewCheckout({ label: '', amount: '', referenceId: '' });
            load();
        } finally {
            setCreatingCheckout(false);
        }
    };

    const copy = (text: string) => {
        navigator.clipboard.writeText(text).catch(() => {});
    };

    const embedSnippet = (checkoutUrl: string) =>
        `<script src="${origin}/embed.js"></script>\n<a href="${checkoutUrl}" data-stepay-checkout="${checkoutUrl}" class="stepay-pay-btn">Pay with Stepay</a>`;

    const iframeSnippet = (embedUrl: string) =>
        `<script src="${origin}/embed.js"></script>\n<div data-stepay-embed="${embedUrl}"></div>`;

    return (
        <DashboardPanel wide>
            <div className={`${dash.panelPadding} space-y-8`}>
                {loading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-accent)] mx-auto" />
                ) : (
                    <>
                        <section className={`${dash.panelInset} p-5 space-y-4`}>
                            <div className="flex items-center gap-2">
                                <Store className="h-5 w-5 text-[var(--brand-accent)]" />
                                <h2 className="font-bold text-white">Quick checkout</h2>
                            </div>
                            <p className={`${dash.hint} text-sm`}>
                                Create a one-time payment link for a fixed amount — school fees, invoices, or shop sales.
                            </p>
                            <form onSubmit={createCheckout} className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2 sm:col-span-2">
                                    <label className={dash.label}>Description</label>
                                    <input
                                        className={dash.input}
                                        placeholder="e.g. Term 2 school fees"
                                        value={newCheckout.label}
                                        onChange={(e) => setNewCheckout((s) => ({ ...s, label: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={dash.label}>Amount (USDC)</label>
                                    <input
                                        type="number"
                                        className={dash.input}
                                        min={1}
                                        step="0.01"
                                        placeholder="25.00"
                                        value={newCheckout.amount}
                                        onChange={(e) => setNewCheckout((s) => ({ ...s, amount: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={dash.label}>Reference (optional)</label>
                                    <input
                                        className={dash.input}
                                        placeholder="INV-2026-001"
                                        value={newCheckout.referenceId}
                                        onChange={(e) => setNewCheckout((s) => ({ ...s, referenceId: e.target.value }))}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <FormError>{error}</FormError>
                                    <button type="submit" disabled={creatingCheckout} className={dash.ctaFull}>
                                        {creatingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                        Create payment link
                                    </button>
                                </div>
                            </form>
                        </section>

                        {checkouts.length > 0 && (
                            <section className="space-y-3">
                                <h2 className="font-bold text-white text-sm">Recent checkouts</h2>
                                <div className="space-y-2">
                                    {checkouts.slice(0, 8).map((c) => (
                                        <div key={c.id} className={`${dash.panelInset} p-4 space-y-3`}>
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{c.label}</p>
                                                    <p className={dash.hint}>
                                                        {c.amount} {String(c.asset).toUpperCase()}
                                                        {c.referenceId ? ` · ${c.referenceId}` : ''} ·{' '}
                                                        <span className={c.status === 'paid' ? 'text-emerald-400' : ''}>{c.status}</span>
                                                    </p>
                                                </div>
                                                <button type="button" onClick={() => copy(c.checkoutUrl)} className={dash.ctaSecondary}>
                                                    <Copy className="h-4 w-4" /> Copy link
                                                </button>
                                            </div>
                                            <details className="text-left">
                                                <summary className={`${dash.hint} cursor-pointer text-[var(--brand-accent)]`}>
                                                    Embed code
                                                </summary>
                                                <pre className="mt-2 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-white/70 whitespace-pre-wrap">
                                                    {embedSnippet(c.checkoutUrl)}
                                                </pre>
                                                <p className={`${dash.hint} mt-2 mb-1`}>Or inline iframe:</p>
                                                <pre className="overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-white/70 whitespace-pre-wrap">
                                                    {iframeSnippet(c.embedUrl)}
                                                </pre>
                                            </details>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className={`${dash.panelInset} p-5 space-y-4`}>
                            <div className="flex items-center gap-2">
                                <Key className="h-5 w-5 text-[var(--brand-accent)]" />
                                <h2 className="font-bold text-white">API keys</h2>
                            </div>
                            <p className={`${dash.hint} text-sm`}>
                                For payroll systems, remittance partners, and school portals — create checkouts server-side.
                            </p>

                            {createdKey && (
                                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm space-y-2">
                                    <p className="text-amber-200 font-semibold">Save these credentials now</p>
                                    <p className="font-mono text-xs break-all text-white/80">API key: {createdKey.key}</p>
                                    <p className="font-mono text-xs break-all text-white/80">
                                        Webhook secret: {createdKey.webhookSecret}
                                    </p>
                                    <button type="button" onClick={() => setCreatedKey(null)} className={dash.ctaSecondary}>
                                        Done
                                    </button>
                                </div>
                            )}

                            <button type="button" onClick={createKey} className={dash.ctaSecondary}>
                                <Plus className="h-4 w-4" /> Generate API key
                            </button>

                            {keys.filter((k) => !k.revokedAt).map((k) => (
                                <div key={k.id} className="flex items-center justify-between gap-3 py-2 border-t border-white/[0.06]">
                                    <div>
                                        <p className="text-sm font-medium text-white">{k.name}</p>
                                        <p className={`${dash.hint} font-mono`}>{k.prefix}…</p>
                                    </div>
                                    <button type="button" onClick={() => revokeKey(k.id)} className="text-red-400/80 hover:text-red-300 p-2">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </section>

                        <section className={`${dash.panelInset} p-5 space-y-3`}>
                            <div className="flex items-center gap-2">
                                <Code2 className="h-5 w-5 text-[var(--brand-accent)]" />
                                <h2 className="font-bold text-white">Partner API</h2>
                            </div>
                            <pre className="overflow-x-auto rounded-lg bg-black/30 p-4 text-xs text-white/70 whitespace-pre-wrap">
{`POST ${origin}/api/v1/checkouts
Authorization: Bearer sk_live_...
Content-Type: application/json

{
  "amount": 25,
  "asset": "usdc",
  "label": "School fees — Term 2",
  "reference": "STU-1042",
  "metadata": { "student_id": "1042" },
  "success_url": "https://yourschool.zm/thank-you",
  "webhook_url": "https://yourschool.zm/hooks/stepay"
}

→ Returns checkout_url for Pay with Stepay button or iframe embed.`}
                            </pre>
                            <p className={dash.hint}>
                                Webhooks send <code className="text-white/50">checkout.paid</code> with a{' '}
                                <code className="text-white/50">Stepay-Signature</code> header (HMAC-SHA256).
                            </p>
                        </section>
                    </>
                )}
            </div>
        </DashboardPanel>
    );
}
