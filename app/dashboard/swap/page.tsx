'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDownUp, CheckCircle, Loader2 } from 'lucide-react';
import { FormError, isXlmReserveMessage } from '@/components/dashboard/FormError';
import { ConfirmStep } from '@/components/dashboard/ConfirmStep';
import { AssetIcon, AssetLabel } from '@/components/AssetIcon';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';
import { dash } from '@/lib/dashboard-ui';
import { confirmDeliveryHint } from '@/lib/confirm-ui';
import { runSignedConfirmFlow } from '@/lib/client-confirm-flow';
import { BackupNudge } from '@/components/wallet/BackupNudge';
import { WalletGateInline } from '@/components/wallet/WalletGateInline';
import { useRequireWalletUnlocked } from '@/components/wallet/useRequireWalletUnlocked';
import { parsePositiveDecimal, sanitizeDecimalInput } from '@/lib/parse-amount';

type Asset = 'xlm' | 'usdc';

function assetLabel(asset: Asset) {
    return asset === 'usdc' ? 'USDC' : 'XLM';
}

export default function SwapPage() {
    const { canProceed, needsUnlock } = useRequireWalletUnlocked();
    const [from, setFrom] = useState<Asset>('xlm');
    const [amount, setAmount] = useState('');
    const [quote, setQuote] = useState<number | null>(null);
    const [balances, setBalances] = useState<{ xlm: number; usdc: number } | null>(null);
    const [isQuoting, setIsQuoting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'form' | 'confirm'>('form');
    const [intentId, setIntentId] = useState('');
    const [devHint, setDevHint] = useState<string | undefined>();
    const [deliveryHint, setDeliveryHint] = useState<string | undefined>();
    const [confirmCode, setConfirmCode] = useState('');
    const [isSigning, setIsSigning] = useState(false);
    const [confirmError, setConfirmError] = useState('');
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [result, setResult] = useState<{ fromAmount: number; toAmount: number; txHash?: string } | null>(null);
    const [quoteError, setQuoteError] = useState(false);

    const to: Asset = from === 'xlm' ? 'usdc' : 'xlm';
    const minAmount = from === 'xlm' ? 0.1 : 1;

    const loadBalances = useCallback(() => {
        fetch('/api/user')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.balance) {
                    setBalances({
                        xlm: Number(data.balance.xlm) || 0,
                        usdc: Number(data.balance.usdc) || 0,
                    });
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        loadBalances();
    }, [loadBalances]);

    useEffect(() => {
        const amountNum = parsePositiveDecimal(amount);
        if (amountNum == null) {
            setQuote(null);
            setQuoteError(false);
            return;
        }

        const id = setTimeout(() => {
            setIsQuoting(true);
            setQuoteError(false);
            fetch(`/api/swap?from=${from}&to=${to}&amount=${encodeURIComponent(String(amountNum))}`)
                .then(async (res) => {
                    if (!res.ok) {
                        setQuote(null);
                        setQuoteError(true);
                        return null;
                    }
                    return res.json();
                })
                .then((data) => {
                    if (data) {
                        setQuote(data?.toAmount ?? null);
                        setQuoteError(false);
                    }
                })
                .catch(() => {
                    setQuote(null);
                    setQuoteError(true);
                })
                .finally(() => setIsQuoting(false));
        }, 300);

        return () => clearTimeout(id);
    }, [amount, from, to]);

    const flipAssets = () => {
        setFrom(to);
        setAmount('');
        setQuote(null);
        setStatus('idle');
        setErrorMessage('');
    };

    const handlePrepare = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus('idle');
        setErrorMessage('');
        setConfirmError('');

        const amountNum = parsePositiveDecimal(amount);
        if (amountNum == null) {
            setErrorMessage('Enter a valid amount greater than zero.');
            setStatus('error');
            setIsLoading(false);
            return;
        }

        if (amountNum < minAmount) {
            setErrorMessage(`Enter at least ${minAmount} ${assetLabel(from)}.`);
            setStatus('error');
            setIsLoading(false);
            return;
        }

        if (!canProceed()) {
            setIsLoading(false);
            return;
        }

        if (!quote) {
            setErrorMessage(quoteError ? 'Could not load swap rate. Check your connection and try again.' : 'Enter an amount to get a quote.');
            setStatus('error');
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/swap/intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ from, to, amount: amountNum }),
            });
            const data = await res.json();

            if (res.ok) {
                setIntentId(data.intentId);
                setDevHint(data.devConfirmCode);
                setDeliveryHint(confirmDeliveryHint(data));
                setConfirmCode('');
                setStep('confirm');
            } else {
                setErrorMessage(data.error || 'Swap failed. Please try again.');
                setStatus('error');
            }
        } catch {
            setErrorMessage('Could not reach our servers. Check your connection and try again.');
            setStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = async () => {
        setIsLoading(true);
        setConfirmError('');
        try {
            const result = await runSignedConfirmFlow({
                confirmUrl: '/api/swap/confirm',
                finalizeUrl: '/api/swap/finalize',
                intentId,
                confirmCode,
                onSigning: () => setIsSigning(true),
            });
            setIsSigning(false);
            if (result.ok) {
                const data = result.data;
                setResult({
                    fromAmount: data.fromAmount as number,
                    toAmount: data.toAmount as number,
                    txHash: String(data.txHash || ''),
                });
                setStatus('success');
                setStep('form');
                loadBalances();
            } else {
                setConfirmError(result.error || 'Confirmation failed.');
            }
        } catch {
            setIsSigning(false);
            setConfirmError('Could not reach our servers. Check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = handlePrepare;

    const fromBalance = balances ? balances[from] : null;

    return (
        <DashboardPanel>
            <div className={dash.panelPadding}>
                {status === 'success' && result ? (
                    <div className="py-6 text-center sm:py-8">
                        <div className={dash.successIcon}>
                            <CheckCircle className="h-8 w-8" />
                        </div>
                        <h3 className="mb-2 font-heading text-lg font-bold text-white sm:text-xl">Swap complete</h3>
                        <p className="mb-4 text-sm text-white/45">
                            {result.fromAmount} {assetLabel(from)} → {result.toAmount} {assetLabel(to)}
                        </p>
                        {result.txHash && (
                            <a
                                href={`https://stellar.expert/explorer/public/tx/${result.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`break-all font-mono text-xs ${dash.accentLink}`}
                            >
                                View on Stellar Explorer
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setStatus('idle');
                                setAmount('');
                                setQuote(null);
                                setResult(null);
                            }}
                            className={`mt-6 ${dash.ctaSecondary}`}
                        >
                            Swap again
                        </button>
                    </div>
                ) : step === 'confirm' ? (
                    <ConfirmStep
                        title="Confirm swap"
                        summary={
                            <>
                                Swap <strong className="text-white">{amount} {assetLabel(from)}</strong> for approximately{' '}
                                <strong className="text-white">
                                    {quote != null ? quote.toFixed(to === 'usdc' ? 2 : 4) : '—'} {assetLabel(to)}
                                </strong>
                            </>
                        }
                        confirmCode={confirmCode}
                        onConfirmCodeChange={setConfirmCode}
                        onConfirm={handleConfirm}
                        onCancel={() => {
                            setStep('form');
                            setConfirmCode('');
                            setConfirmError('');
                        }}
                        isLoading={isLoading}
                        error={confirmError}
                        errorVariant={isXlmReserveMessage(confirmError) ? 'warning' : 'error'}
                        devHint={devHint}
                        deliveryHint={isSigning ? 'Signing with your wallet…' : deliveryHint}
                        showConfirmSteps
                    />
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className={`${dash.panelInset} space-y-3 p-4`}>
                            <div className="flex items-center justify-between gap-2">
                                <label className={dash.sectionLabel}>You pay</label>
                                {fromBalance != null && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const max = from === 'xlm' ? Math.max(0, fromBalance - 1.5) : fromBalance;
                                            setAmount(max > 0 ? sanitizeDecimalInput(max.toFixed(from === 'usdc' ? 2 : 4)) : '');
                                        }}
                                        className="text-[0.6875rem] font-semibold text-[var(--brand-accent)] hover:text-[var(--brand-accent-hover)]"
                                    >
                                        Max: {fromBalance.toFixed(from === 'usdc' ? 2 : 4)}
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <AssetIcon asset={from} size="sm" className="hidden sm:block" />
                                <select
                                    value={from}
                                    onChange={(e) => {
                                        setFrom(e.target.value as Asset);
                                        setAmount('');
                                        setQuote(null);
                                        setErrorMessage('');
                                        setStatus('idle');
                                    }}
                                    className={`${dash.select} !w-auto shrink-0 !min-w-[100px]`}
                                >
                                    <option value="xlm">XLM</option>
                                    <option value="usdc">USDC</option>
                                </select>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={amount}
                                    onChange={(e) => {
                                        setAmount(sanitizeDecimalInput(e.target.value));
                                        setErrorMessage('');
                                        setStatus('idle');
                                    }}
                                    className={`${dash.input} flex-1 text-right text-lg font-bold tabular-nums`}
                                    placeholder="0.00"
                                    autoComplete="off"
                                    required
                                />
                            </div>
                            <p className={dash.hint}>
                                Min {minAmount} {assetLabel(from)}
                                {from === 'xlm' ? (
                                    <span className="text-[var(--brand-accent)]/90"> · 1.5 XLM reserved for network fees</span>
                                ) : null}
                            </p>
                        </div>

                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={flipAssets}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] text-white/70 transition-colors hover:border-[var(--brand-accent)]/30 hover:text-[var(--brand-accent)]"
                                aria-label="Flip swap direction"
                            >
                                <ArrowDownUp className="h-4 w-4" />
                            </button>
                        </div>

                        <div className={`${dash.panelInset} space-y-2 p-4`}>
                            <p className={dash.sectionLabel}>You receive</p>
                            <div className="flex items-center justify-between gap-3">
                                <AssetLabel asset={to} size="sm" nameClassName="text-sm font-semibold text-white" />
                                <span className="text-lg font-bold tabular-nums text-white">
                                    {isQuoting ? '…' : quote != null ? quote.toFixed(to === 'usdc' ? 2 : 4) : '—'}
                                </span>
                            </div>
                            <p className={dash.hint}>Rate includes platform spread</p>
                            {quoteError && parsePositiveDecimal(amount) != null && (
                                <p className="text-xs text-red-300/90">
                                    Could not load rate.{' '}
                                    <button
                                        type="button"
                                        className="font-semibold text-[var(--brand-accent)] underline"
                                        onClick={() => {
                                            const amountNum = parsePositiveDecimal(amount);
                                            if (amountNum == null) return;
                                            setIsQuoting(true);
                                            setQuoteError(false);
                                            fetch(`/api/swap?from=${from}&to=${to}&amount=${encodeURIComponent(String(amountNum))}`)
                                                .then(async (res) => (res.ok ? res.json() : null))
                                                .then((data) => {
                                                    if (data) setQuote(data.toAmount ?? null);
                                                    else setQuoteError(true);
                                                })
                                                .catch(() => setQuoteError(true))
                                                .finally(() => setIsQuoting(false));
                                        }}
                                    >
                                        Retry
                                    </button>
                                </p>
                            )}
                        </div>

                        <BackupNudge />
                        {needsUnlock && <WalletGateInline />}

                        <FormError variant={isXlmReserveMessage(errorMessage) ? 'warning' : 'error'}>
                            {status === 'error' ? errorMessage : null}
                        </FormError>

                        <button type="submit" disabled={isLoading || !quote} className={dash.ctaFull}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownUp className="h-4 w-4" />}
                            {isLoading ? 'Preparing…' : `Review swap to ${assetLabel(to)}`}
                        </button>
                    </form>
                )}
            </div>
        </DashboardPanel>
    );
}
