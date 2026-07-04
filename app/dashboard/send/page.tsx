'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, Loader2, CheckCircle, Phone, Wallet } from 'lucide-react';
import { ConfirmStep } from '@/components/dashboard/ConfirmStep';
import { FormError } from '@/components/dashboard/FormError';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';
import { dash } from '@/lib/dashboard-ui';
import { confirmDeliveryHint } from '@/lib/confirm-ui';
import { runSignedConfirmFlow } from '@/lib/client-confirm-flow';
import { BackupNudge } from '@/components/wallet/BackupNudge';
import { WalletGateInline } from '@/components/wallet/WalletGateInline';
import { useRequireWalletUnlocked } from '@/components/wallet/useRequireWalletUnlocked';

type SendMode = 'phone' | 'address';

function toFriendlySendError(msg?: string): string {
    if (!msg || msg.toLowerCase().includes('server')) return 'Something went wrong. Please try again in a moment.';
    const m = msg.toLowerCase();
    if (m.includes('insufficient') || m.includes('balance')) return msg;
    if (m.includes('phone') || m.includes('profile') || m.includes('confirmation') || m.includes('code')) return msg;
    if (m.includes('invalid') && m.includes('address')) return 'Please check the Stellar address (starts with G).';
    return msg;
}

export default function SendPage() {
    return (
        <Suspense
            fallback={
                <DashboardPanel>
                    <div className={`${dash.panelPadding} flex justify-center py-12`}>
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-accent)]" />
                    </div>
                </DashboardPanel>
            }
        >
            <SendPageInner />
        </Suspense>
    );
}

function SendPageInner() {
    const searchParams = useSearchParams();
    const { canProceed, needsUnlock } = useRequireWalletUnlocked();
    const [mode, setMode] = useState<SendMode>('phone');
    const [asset, setAsset] = useState<'xlm' | 'usdc'>('usdc');
    const [phone, setPhone] = useState('');
    const [to, setTo] = useState('');
    const [amount, setAmount] = useState('');
    const [memo, setMemo] = useState('');
    const [lookupHint, setLookupHint] = useState<string | null>(null);
    const [step, setStep] = useState<'form' | 'confirm'>('form');
    const [intentId, setIntentId] = useState('');
    const [devHint, setDevHint] = useState<string | undefined>();
    const [deliveryHint, setDeliveryHint] = useState<string | undefined>();
    const [confirmCode, setConfirmCode] = useState('');
    const [isSigning, setIsSigning] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [txHash, setTxHash] = useState('');
    const [claimUrl, setClaimUrl] = useState('');
    const [claimCopied, setClaimCopied] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [checkoutToken, setCheckoutToken] = useState('');
    const [requestToken, setRequestToken] = useState('');
    const [paySlug, setPaySlug] = useState('');
    const [paymentLocked, setPaymentLocked] = useState(false);
    const [paymentLabel, setPaymentLabel] = useState<string | null>(null);

    const minAmount = asset === 'usdc' ? 1 : 0.1;

    useEffect(() => {
        const checkout = searchParams.get('checkout');
        const pay = searchParams.get('pay');
        const request = searchParams.get('request');
        if (!checkout && !pay && !request) return;

        const qs = checkout
            ? `checkout=${encodeURIComponent(checkout)}`
            : pay
              ? `pay=${encodeURIComponent(pay)}`
              : `request=${encodeURIComponent(request!)}`;

        fetch(`/api/send/prefill?${qs}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.error) {
                    setErrorMessage(data.error);
                    setStatus('error');
                    return;
                }
                setMode('address');
                setTo(String(data.to ?? ''));
                if (data.amount != null) setAmount(String(data.amount));
                setAsset(data.asset === 'xlm' ? 'xlm' : 'usdc');
                if (data.memo) setMemo(String(data.memo));
                setCheckoutToken(data.checkoutToken ?? '');
                setRequestToken(data.requestToken ?? '');
                setPaySlug(data.paySlug ?? '');
                setPaymentLocked(!!data.locked);
                setPaymentLabel(data.label ?? data.merchantName ?? null);
            })
            .catch(() => setErrorMessage('Could not load payment details.'));
    }, [searchParams]);

    useEffect(() => {
        if (mode !== 'phone' || phone.replace(/\D/g, '').length < 9) {
            setLookupHint(null);
            return;
        }
        const t = setTimeout(async () => {
            try {
                const res = await fetch('/api/send/lookup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone }),
                });
                const data = await res.json();
                if (res.ok) {
                    setLookupHint(
                        data.registered
                            ? `${data.displayName ? data.displayName + ' · ' : ''}On Stepay`
                            : 'Not on Stepay yet — they\'ll get a claim link'
                    );
                }
            } catch {
                setLookupHint(null);
            }
        }, 500);
        return () => clearTimeout(t);
    }, [phone, mode]);

    const resetFlow = () => {
        setStep('form');
        setIntentId('');
        setDevHint(undefined);
        setConfirmCode('');
        setStatus('idle');
        setPhone('');
        setTo('');
        setAmount('');
        setMemo('');
        setClaimUrl('');
        setErrorMessage('');
        setCheckoutToken('');
        setRequestToken('');
        setPaySlug('');
        setPaymentLocked(false);
        setPaymentLabel(null);
    };

    const handlePrepare = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus('idle');
        setErrorMessage('');

        if (!canProceed()) {
            setIsLoading(false);
            return;
        }

        try {
            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum < minAmount) {
                setErrorMessage(`Please enter at least ${minAmount} ${asset.toUpperCase()} to send.`);
                setStatus('error');
                return;
            }

            const body =
                mode === 'phone'
                    ? {
                          mode: 'phone',
                          phone: phone.trim(),
                          amount: amountNum,
                          asset,
                          memo: memo.trim() || undefined,
                          checkoutToken: checkoutToken || undefined,
                          requestToken: requestToken || undefined,
                          paySlug: paySlug || undefined,
                      }
                    : {
                          mode: 'address',
                          to: to.trim(),
                          amount: amountNum,
                          asset,
                          memo: memo.trim() || undefined,
                          checkoutToken: checkoutToken || undefined,
                          requestToken: requestToken || undefined,
                          paySlug: paySlug || undefined,
                      };

            const res = await fetch('/api/send/intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setErrorMessage(toFriendlySendError(data.error));
                setStatus('error');
                return;
            }

            setIntentId(data.intentId);
            setDevHint(data.devConfirmCode);
            setDeliveryHint(confirmDeliveryHint(data));
            setConfirmCode('');
            setStep('confirm');
        } catch {
            setErrorMessage('We couldn\'t reach our servers. Please check your connection and try again.');
            setStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = async () => {
        setIsLoading(true);
        setErrorMessage('');
        try {
            const result = await runSignedConfirmFlow({
                confirmUrl: '/api/send/confirm',
                finalizeUrl: '/api/send/finalize',
                intentId,
                confirmCode,
                onSigning: () => setIsSigning(true),
            });
            setIsSigning(false);
            if (result.ok) {
                const data = result.data;
                setTxHash(String(data.txHash || ''));
                setClaimUrl(String(data.claimUrl || ''));
                setStatus('success');
                setStep('form');
                if (data.successUrl) {
                    window.location.href = String(data.successUrl);
                }
            } else {
                setErrorMessage(toFriendlySendError(result.error));
            }
        } catch {
            setIsSigning(false);
            setErrorMessage('We couldn\'t reach our servers. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const recipientLabel = mode === 'phone' ? phone.trim() : to.trim();

    return (
        <DashboardPanel
            title={paymentLabel ? 'Complete payment' : undefined}
            subtitle={paymentLabel ? `Pay ${paymentLabel} with your Stepay wallet` : undefined}
        >
            <div className={dash.panelPadding}>
                {status === 'success' ? (
                    <div className="text-center py-6 sm:py-8">
                        <div className={dash.successIcon}>
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold font-heading text-white mb-2">Sent!</h3>
                        <p className="text-white/45 text-sm mb-4">
                            {claimUrl
                                ? 'Recipient will get a link to claim their money on Stepay.'
                                : `Your ${amount} ${asset.toUpperCase()} was delivered.`}
                        </p>
                        {claimUrl && (
                            <div className="mb-3 flex flex-col items-center gap-2">
                                <p className="text-xs text-white/50 break-all font-mono">{claimUrl}</p>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(claimUrl);
                                            setClaimCopied(true);
                                            window.setTimeout(() => setClaimCopied(false), 2000);
                                        } catch {
                                            // ignore
                                        }
                                    }}
                                    className={dash.ctaSecondary}
                                >
                                    {claimCopied ? 'Copied!' : 'Copy claim link'}
                                </button>
                            </div>
                        )}
                        {txHash && (
                            <a
                                href={`https://stellar.expert/explorer/public/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-xs font-mono break-all transition-colors ${dash.accentLink}`}
                            >
                                View on Stellar Explorer
                            </a>
                        )}
                        <button onClick={resetFlow} className={`mt-6 ${dash.ctaSecondary}`}>
                            Send again
                        </button>
                    </div>
                ) : step === 'confirm' ? (
                    <ConfirmStep
                        title="Confirm send"
                        summary={
                            <>
                                Send <strong className="text-white">{amount} {asset.toUpperCase()}</strong> to{' '}
                                <span className="font-mono text-white/80">{recipientLabel}</span>
                                {memo.trim() ? <> — &quot;{memo.trim()}&quot;</> : null}
                            </>
                        }
                        confirmCode={confirmCode}
                        onConfirmCodeChange={setConfirmCode}
                        onConfirm={handleConfirm}
                        onCancel={() => {
                            setStep('form');
                            setConfirmCode('');
                            setErrorMessage('');
                        }}
                        isLoading={isLoading}
                        error={errorMessage}
                        devHint={devHint}
                        deliveryHint={isSigning ? 'Signing with your wallet…' : deliveryHint}
                        showConfirmSteps
                    />
                ) : (
                    <form onSubmit={handlePrepare} className="space-y-6">
                        {!paymentLocked && (
                        <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
                            <button
                                type="button"
                                onClick={() => setMode('phone')}
                                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                                    mode === 'phone' ? 'bg-[var(--brand-accent-muted)] text-[var(--brand-accent)]' : 'text-white/50'
                                }`}
                            >
                                <Phone className="h-4 w-4" /> Phone number
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('address')}
                                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                                    mode === 'address' ? 'bg-[var(--brand-accent-muted)] text-[var(--brand-accent)]' : 'text-white/50'
                                }`}
                            >
                                <Wallet className="h-4 w-4" /> Stellar address
                            </button>
                        </div>
                        )}

                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className={dash.label}>Asset</label>
                                <select
                                    value={asset}
                                    onChange={(e) => { setAsset(e.target.value as 'xlm' | 'usdc'); setErrorMessage(''); setStatus('idle'); }}
                                    className={dash.select}
                                    disabled={paymentLocked}
                                >
                                    <option value="usdc">USDC (digital dollar)</option>
                                    <option value="xlm">XLM</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className={dash.label}>Amount ({asset.toUpperCase()})</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => { setAmount(e.target.value); setErrorMessage(''); setStatus('idle'); }}
                                    className={`${dash.input} font-semibold`}
                                    placeholder="0.00"
                                    step={asset === 'usdc' ? '0.01' : '0.0000001'}
                                    min={minAmount}
                                    required
                                    readOnly={paymentLocked}
                                />
                                <p className={dash.hint}>Min {minAmount} {asset.toUpperCase()}</p>
                            </div>
                        </div>

                        {!paymentLocked && mode === 'phone' ? (
                            <div className="space-y-2">
                                <label className={dash.label}>Recipient mobile number</label>
                                <div className={dash.phoneGroup}>
                                    <span className={dash.phonePrefix}>+260</span>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => { setPhone(e.target.value); setErrorMessage(''); setStatus('idle'); }}
                                        className={dash.phoneInput}
                                        placeholder="971234567"
                                        required
                                    />
                                </div>
                                {lookupHint && <p className={`${dash.hint} text-[var(--brand-accent)]/80`}>{lookupHint}</p>}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className={dash.label}>Stellar address</label>
                                <input
                                    type="text"
                                    value={to}
                                    onChange={(e) => { setTo(e.target.value); setErrorMessage(''); setStatus('idle'); }}
                                    className={`${dash.input} font-mono`}
                                    placeholder="G..."
                                    required
                                    readOnly={paymentLocked}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className={dash.label}>
                                Note <span className="font-normal text-white/40">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                className={dash.input}
                                placeholder="What's this for?"
                                maxLength={28}
                            />
                        </div>

                        <BackupNudge />
                        {needsUnlock && <WalletGateInline />}
                        <FormError>{status === 'error' ? errorMessage : null}</FormError>

                        <button type="submit" disabled={isLoading} className={dash.ctaFull}>
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            {isLoading ? 'Preparing…' : paymentLocked ? 'Review payment' : 'Review send'}
                        </button>
                    </form>
                )}
            </div>
        </DashboardPanel>
    );
}
