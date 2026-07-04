'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HandCoins, Loader2, CheckCircle, Share2 } from 'lucide-react';
import { FormError } from '@/components/dashboard/FormError';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';
import { dash } from '@/lib/dashboard-ui';

export default function RequestMoneyPage() {
    const [amount, setAmount] = useState('');
    const [asset, setAsset] = useState<'usdc' | 'xlm'>('usdc');
    const [payerPhone, setPayerPhone] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ payUrl: string; whatsAppUrl: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/request-money', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    asset,
                    payerPhone: payerPhone.trim() || undefined,
                    note: note.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Failed to create request');
                return;
            }
            setResult({ payUrl: data.payUrl, whatsAppUrl: data.whatsAppUrl });
        } catch {
            setError('Network error. Try again.');
        } finally {
            setLoading(false);
        }
    };

    if (result) {
        return (
            <DashboardPanel title="Request sent" subtitle="Share the link so they can pay you on Stepay.">
                <div className={`${dash.panelPadding} text-center py-8`}>
                    <CheckCircle className="mx-auto h-12 w-12 text-[var(--brand-accent)] mb-4" />
                    <p className="text-sm text-white/50 mb-4 break-all font-mono">{result.payUrl}</p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <a href={result.whatsAppUrl} target="_blank" rel="noopener noreferrer" className={dash.cta}>
                            <Share2 className="h-4 w-4" /> Share on WhatsApp
                        </a>
                        <button type="button" onClick={() => setResult(null)} className={dash.ctaSecondary}>
                            New request
                        </button>
                    </div>
                </div>
            </DashboardPanel>
        );
    }

    return (
        <DashboardPanel>
            <div className={dash.panelPadding}>
                <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
                    {error && (
                        <FormError>{error}</FormError>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className={dash.label}>Amount</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className={dash.input}
                                min={asset === 'usdc' ? 1 : 0.1}
                                step={asset === 'usdc' ? '0.01' : '0.0001'}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={dash.label}>Asset</label>
                            <select value={asset} onChange={(e) => setAsset(e.target.value as 'usdc' | 'xlm')} className={dash.select}>
                                <option value="usdc">USDC</option>
                                <option value="xlm">XLM</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className={dash.label}>Payer phone <span className="text-white/40">(optional)</span></label>
                        <div className={dash.phoneGroup}>
                            <span className={dash.phonePrefix}>+260</span>
                            <input
                                type="tel"
                                value={payerPhone}
                                onChange={(e) => setPayerPhone(e.target.value)}
                                className={dash.phoneInput}
                                placeholder="971234567"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className={dash.label}>Note</label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className={dash.input}
                            placeholder="e.g. Lunch split"
                            maxLength={140}
                        />
                    </div>
                    <button type="submit" disabled={loading} className={dash.ctaFull}>
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <HandCoins className="h-5 w-5" />}
                        {loading ? 'Creating…' : 'Create payment request'}
                    </button>
                </form>
            </div>
        </DashboardPanel>
    );
}
