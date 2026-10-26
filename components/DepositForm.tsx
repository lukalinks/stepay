'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowDownLeft, Loader2 } from 'lucide-react';
import { FormError } from '@/components/dashboard/FormError';
import { useMarketRates } from '@/components/market/useMarketRates';
import { dash } from '@/lib/dashboard-ui';
import { formatPhoneE164ForMarket, localPhoneDisplayForMarket } from '@/lib/phone';
import type { MobileOperatorId } from '@/lib/markets';
import { MobileOperatorPicker } from '@/components/MobileOperatorPicker';
import { DepositReviewStep } from '@/components/deposit/DepositReviewStep';
import { DepositStatusTracker, type DepositTrackStep } from '@/components/deposit/DepositStatusTracker';
import { DepositSuccessModal } from '@/components/deposit/DepositSuccessModal';
import { useWallet } from '@/components/wallet/WalletProvider';
import { WalletGateInline } from '@/components/wallet/WalletGateInline';
import { useRequireWalletUnlocked } from '@/components/wallet/useRequireWalletUnlocked';
import { prepareUsdcWallet } from '@/lib/usdc-deposit-client';
import {
    clearActiveDeposit,
    depositFailureCopy,
    loadActiveDeposit,
    mapConfirmToDepositStep,
    saveActiveDeposit,
} from '@/lib/deposit-track-ui';

function toFriendlyDepositError(msg?: string, httpStatus?: number): string {
    if (!msg) return 'Something went wrong. Please try again in a moment.';
    if (httpStatus === 401) return 'Please sign in again to continue.';
    const m = msg.toLowerCase();
    if (
        httpStatus === 503 ||
        m.includes('not available right now') ||
        m.includes('try again later or contact support') ||
        m.includes('liquidity')
    ) {
        return 'Deposits are not available right now. Please try again later or contact support.';
    }
    if (m.includes('minimum') || m.includes('maximum') || m.includes('first deposit')) return msg;
    if (m.includes('mobile') || m.includes('phone') || m.includes('number')) return msg;
    if (m.includes('lenco') || m.includes('api credentials') || m.includes('api key') || m.includes('unauthorized')) return msg;
    if (m.includes('account details') || m.includes('mobile money wallet')) return msg;
    if (m.includes('does not match the selected network')) return msg;
    if (m.includes('collection') || m.includes('mobile money')) return msg;
    if (m.includes('unlock your wallet') || (m.includes('usdc') && m.includes('trustline'))) return msg;
    return msg;
}

const DEFAULT_RATES = { xlm: { buy: 3.5 }, usdc: { buy: 25 } } as const;

type DepositPhase = 'form' | 'review' | 'tracking';

type DepositSnapshot = {
    amount: number;
    asset: 'xlm' | 'usdc';
    phone: string;
    operator: MobileOperatorId;
    cryptoAmount: number;
    activationFiat: number;
    activationXlm: number;
};

interface DepositFormProps {
    onSuccess?: () => void;
    compact?: boolean;
    /** Hide title row when wrapped in DashboardPanel */
    embedded?: boolean;
}

export function DepositForm({ onSuccess, compact, embedded }: DepositFormProps) {
    const { ensureUsdcReady, walletCustody } = useWallet();
    const { walletReady } = useRequireWalletUnlocked();
    const { market, rates: marketRates, limits, fetchRates, formatFiat, hasMobileMoney, defaultOperator } = useMarketRates();
    const [asset, setAsset] = useState<'xlm' | 'usdc'>('xlm');
    const [amount, setAmount] = useState('');
    const [phone, setPhone] = useState('');
    const [operator, setOperator] = useState<MobileOperatorId>(defaultOperator);
    const [phase, setPhase] = useState<DepositPhase>('form');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [lastReference, setLastReference] = useState('');
    const [depositStep, setDepositStep] = useState<DepositTrackStep>('awaiting_approval');
    const [snapshot, setSnapshot] = useState<DepositSnapshot | null>(null);
    const [usdcNeedsUnlock, setUsdcNeedsUnlock] = useState(false);
    const [activation, setActivation] = useState<{ required: boolean; xlm: number; fiat: number }>({
        required: false,
        xlm: 0,
        fiat: 0,
    });
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isPreparingUsdc, setIsPreparingUsdc] = useState(false);
    const [hasBackgroundDeposit, setHasBackgroundDeposit] = useState(false);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const completedRef = useRef(false);
    const rates = marketRates ?? DEFAULT_RATES;

    const runUsdcPrep = useCallback(async () => {
        const result = await prepareUsdcWallet({
            ensureUsdcReady,
            walletReady,
            allowDeferredActivation: true,
        });
        if (!result.ok) setUsdcNeedsUnlock(Boolean(result.needsUnlock));
        else setUsdcNeedsUnlock(false);
        return result;
    }, [ensureUsdcReady, walletReady]);

    const rate = rates[asset].buy;
    const minFiat = limits.minDeposit;
    const maxFiat = limits.maxDeposit;
    const cryptoAmount = Number(amount || 0) / rate;
    const activationFiat = asset === 'usdc' && activation.required ? activation.fiat : 0;
    const activationXlm = asset === 'usdc' && activation.required ? activation.xlm : 0;

    useEffect(() => {
        const onFocus = () => fetchRates();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [fetchRates]);

    useEffect(() => {
        setOperator(defaultOperator);
    }, [defaultOperator]);

    useEffect(() => {
        if (asset !== 'usdc') {
            setUsdcNeedsUnlock(false);
            setActivation({ required: false, xlm: 0, fiat: 0 });
            return;
        }
        fetch('/api/deposit/activation?asset=usdc')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                const a = data?.activation;
                if (a) {
                    setActivation({
                        required: Boolean(a.required),
                        xlm: Number(a.xlm) || 0,
                        fiat: Number(a.fiat) || 0,
                    });
                }
            })
            .catch(() => {});
        fetch('/api/deposit/usdc-ready')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data) setUsdcNeedsUnlock(Boolean(data.needsUnlock) && !data.activationRequired);
            })
            .catch(() => {});
    }, [asset, walletReady]);

    useEffect(() => {
        if (asset !== 'usdc' || !walletReady || activation.required) return;
        runUsdcPrep().catch(() => {});
    }, [asset, walletReady, runUsdcPrep, activation.required]);

    useEffect(() => {
        fetch('/api/user')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                const userCountry = data?.user?.countryCode ?? market.countryCode;
                const phoneValue = data?.user?.phone ?? data?.user?.phone_number;
                if (phoneValue) {
                    setPhone(localPhoneDisplayForMarket(String(phoneValue), userCountry));
                }
                const preferred = data?.user?.preferred_operator;
                if (preferred && market.mobileOperators.some((op) => op.id === preferred)) {
                    setOperator(preferred as MobileOperatorId);
                }
            })
            .catch(() => {});
    }, [market.countryCode, market.mobileOperators]);

    const clearError = () => setErrorMessage('');

    const resetForm = useCallback((opts?: { keepSession?: boolean }) => {
        setPhase('form');
        setLastReference('');
        setDepositStep('awaiting_approval');
        setSnapshot(null);
        setShowSuccessModal(false);
        setErrorMessage('');
        completedRef.current = false;
        if (!opts?.keepSession) {
            clearActiveDeposit();
            setHasBackgroundDeposit(false);
        } else {
            setHasBackgroundDeposit(true);
        }
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    }, []);

    const resumeActiveDeposit = useCallback(() => {
        const saved = loadActiveDeposit();
        if (!saved) {
            setHasBackgroundDeposit(false);
            return false;
        }
        setSnapshot({
            amount: saved.amount,
            asset: saved.asset,
            phone: saved.phone,
            operator: saved.operator,
            cryptoAmount: saved.cryptoAmount,
            activationFiat: saved.activationFiat,
            activationXlm: saved.activationXlm,
        });
        setLastReference(saved.reference);
        setDepositStep('awaiting_approval');
        setPhase('tracking');
        setAsset(saved.asset);
        setAmount(String(saved.amount));
        setPhone(saved.phone);
        setOperator(saved.operator);
        setErrorMessage('');
        setHasBackgroundDeposit(false);
        return true;
    }, []);

    // Resume in-progress deposit after refresh / navigation.
    useEffect(() => {
        if (!resumeActiveDeposit()) {
            setHasBackgroundDeposit(Boolean(loadActiveDeposit()));
        }
    }, [resumeActiveDeposit]);

    const validateAndBuildSnapshot = (): DepositSnapshot | null => {
        const amountNum = Number(amount);
        try {
            formatPhoneE164ForMarket(phone, market.countryCode);
        } catch {
            setErrorMessage('Please enter your full mobile money number so we can send you the payment request.');
            return null;
        }
        if (!amount || amountNum < minFiat) {
            setErrorMessage(`Please enter at least ${formatFiat(minFiat)} to deposit. Small deposits help us keep fees low for everyone.`);
            return null;
        }
        if (amountNum > maxFiat) {
            setErrorMessage(`Deposits are limited to ${formatFiat(maxFiat)} per transaction. You can make multiple deposits if needed.`);
            return null;
        }
        if (!hasMobileMoney) {
            setErrorMessage(
                market.comingSoon
                    ? `Cash in coming soon in ${market.countryName}.`
                    : 'Cash in is not available for your country with mobile money.'
            );
            return null;
        }
        return {
            amount: amountNum,
            asset,
            phone,
            operator,
            cryptoAmount: amountNum / rate,
            activationFiat: asset === 'usdc' && activation.required ? activation.fiat : 0,
            activationXlm: asset === 'usdc' && activation.required ? activation.xlm : 0,
        };
    };

    const handlePrepare = (e: React.FormEvent) => {
        e.preventDefault();
        const data = validateAndBuildSnapshot();
        if (!data) return;
        if (data.asset === 'usdc' && walletCustody === 'self' && !walletReady) {
            setErrorMessage('Unlock your wallet before paying for USDC so we can finish the trustline after payment.');
            return;
        }
        setSnapshot(data);
        setErrorMessage('');
        setPhase('review');
    };

    const handleConfirmDeposit = async () => {
        if (!snapshot) return;

        let fullPhone: string;
        try {
            fullPhone = formatPhoneE164ForMarket(snapshot.phone, market.countryCode);
        } catch {
            setErrorMessage('Please enter a valid mobile money number.');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
            if (snapshot.asset === 'usdc') {
                setIsPreparingUsdc(true);
                const prep = await runUsdcPrep();
                if (prep.ok) {
                    setUsdcNeedsUnlock(Boolean(prep.needsUnlock));
                } else if (prep.needsUnlock || prep.code === 'usdc_trustline_required') {
                    setUsdcNeedsUnlock(true);
                } else {
                    setUsdcNeedsUnlock(Boolean(prep.needsUnlock));
                }
                // Block pay if self-custody wallet still needs unlock — avoids paid-but-stuck USDC.
                if (walletCustody === 'self' && (prep.needsUnlock || !walletReady)) {
                    setErrorMessage(
                        'Unlock your wallet first, then confirm again. We need it open to receive your USDC after payment.'
                    );
                    setIsLoading(false);
                    setIsPreparingUsdc(false);
                    return;
                }
            }

            const res = await fetch('/api/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: snapshot.amount,
                    phone: fullPhone,
                    operator: snapshot.operator,
                    asset: snapshot.asset,
                }),
            });

            const data = await res.json();

            if (res.ok && data.success !== false) {
                const reference = typeof data.reference === 'string' ? data.reference : '';
                setLastReference(reference);
                setDepositStep('awaiting_approval');
                completedRef.current = false;
                setPhase('tracking');
                if (reference) {
                    saveActiveDeposit({
                        reference,
                        asset: snapshot.asset,
                        amount: snapshot.amount,
                        phone: snapshot.phone,
                        operator: snapshot.operator,
                        cryptoAmount: snapshot.cryptoAmount,
                        activationFiat: snapshot.activationFiat,
                        activationXlm: snapshot.activationXlm,
                    });
                }
            } else {
                setErrorMessage(toFriendlyDepositError(data.error, res.status));
            }
        } catch {
            setErrorMessage('We couldn\'t reach our servers. Please check your internet connection and try again.');
        } finally {
            setIsLoading(false);
            setIsPreparingUsdc(false);
        }
    };

    useEffect(() => {
        if (phase !== 'tracking' || !lastReference) return;

        const checkStatus = () => {
            fetch('/api/deposit/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference: lastReference }),
            })
                .then((res) => (res.ok ? res.json() : null))
                .then((data) => {
                    if (!data) return;

                    const next = mapConfirmToDepositStep(data);
                    if (!next) return;

                    if (next === 'failed') {
                        setDepositStep('failed');
                        setErrorMessage(depositFailureCopy(data));
                        clearActiveDeposit();
                        if (pollIntervalRef.current) {
                            clearInterval(pollIntervalRef.current);
                            pollIntervalRef.current = null;
                        }
                        return;
                    }

                    if (next === 'waiting_trustline' || next === 'crediting') {
                        setDepositStep(next);
                        if (snapshot?.asset === 'usdc' && walletReady) {
                            runUsdcPrep().catch(() => {});
                        }
                    } else if (next === 'awaiting_approval') {
                        setDepositStep('awaiting_approval');
                    }

                    if (next === 'complete') {
                        setDepositStep('complete');
                        clearActiveDeposit();
                        if (!completedRef.current) {
                            completedRef.current = true;
                            setShowSuccessModal(true);
                            onSuccess?.();
                        }
                        if (pollIntervalRef.current) {
                            clearInterval(pollIntervalRef.current);
                            pollIntervalRef.current = null;
                        }
                    }
                })
                .catch(() => {});
        };

        pollIntervalRef.current = setInterval(checkStatus, 3000);
        checkStatus();
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [phase, lastReference, onSuccess, snapshot?.asset, walletReady, runUsdcPrep]);

    useEffect(() => {
        if (phase !== 'tracking' || snapshot?.asset !== 'usdc') return;
        if (!walletReady || depositStep === 'complete' || depositStep === 'failed') return;
        // Only attempt trustline after payment reached crediting / waiting_trustline.
        if (depositStep !== 'crediting' && depositStep !== 'waiting_trustline') return;

        runUsdcPrep().catch(() => {});
        const id = setInterval(() => {
            runUsdcPrep().catch(() => {});
        }, 8000);
        return () => clearInterval(id);
    }, [phase, snapshot?.asset, walletReady, depositStep, runUsdcPrep]);

    const paddingClass = compact ? 'p-4 sm:p-5' : dash.panelPadding;

    return (
        <>
            <div className={paddingClass}>
                {!embedded && phase === 'form' && (
                    <div className="mb-4 flex items-center gap-3 sm:mb-5">
                        <div className={dash.iconBadge}>
                            <ArrowDownLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <h2 className={dash.heading}>Deposit</h2>
                    </div>
                )}

                {phase === 'review' && snapshot ? (
                    <div className="space-y-4">
                        {snapshot.asset === 'usdc' && walletCustody === 'self' && !walletReady && (
                            <WalletGateInline />
                        )}
                        {isPreparingUsdc && (
                            <p className={`${dash.hint} flex items-center gap-2`}>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Preparing your USDC wallet…
                            </p>
                        )}
                        <DepositReviewStep
                            amount={snapshot.amount}
                            asset={snapshot.asset}
                            cryptoAmount={snapshot.cryptoAmount}
                            phoneDisplay={snapshot.phone}
                            dialCode={market.phoneDialCode}
                            operator={snapshot.operator}
                            currency={market.currency}
                            formatFiat={formatFiat}
                            rate={rate}
                            activationFiat={snapshot.activationFiat}
                            activationXlm={snapshot.activationXlm}
                            onConfirm={handleConfirmDeposit}
                            onCancel={() => {
                                setPhase('form');
                                setErrorMessage('');
                            }}
                            isLoading={isLoading}
                            error={errorMessage}
                        />
                    </div>
                ) : phase === 'tracking' && snapshot ? (
                    <div className="space-y-6 py-2">
                        <DepositStatusTracker
                            step={depositStep}
                            asset={snapshot.asset}
                            reference={lastReference}
                            errorMessage={depositStep === 'failed' ? errorMessage : undefined}
                            compact={compact}
                        />
                        {snapshot.asset === 'usdc' &&
                            (depositStep === 'waiting_trustline' || depositStep === 'crediting') &&
                            walletCustody === 'self' &&
                            !walletReady && (
                                <WalletGateInline
                                    message={
                                        depositStep === 'waiting_trustline'
                                            ? 'Your mobile money payment succeeded. Unlock your wallet to receive USDC — we will finish automatically.'
                                            : 'Unlock your wallet so USDC can arrive as soon as payment clears.'
                                    }
                                    ctaLabel="Unlock to receive USDC"
                                />
                            )}
                        <div className="flex flex-col gap-2 sm:flex-row">
                            {depositStep === 'failed' ? (
                                <button type="button" onClick={() => resetForm()} className={`${dash.ctaFull} flex-1`}>
                                    Try again
                                </button>
                            ) : depositStep === 'complete' ? (
                                <button type="button" onClick={() => resetForm()} className={`${dash.ctaFull} flex-1`}>
                                    Deposit more
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => resetForm({ keepSession: true })}
                                    className={`${dash.ctaSecondary} flex-1`}
                                >
                                    Continue in background
                                </button>
                            )}
                        </div>
                        {depositStep !== 'complete' && depositStep !== 'failed' && (
                            <p className="text-center text-[0.6875rem] text-white/35">
                                You can leave this screen — we keep watching and will credit your wallet when payment
                                clears.
                            </p>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handlePrepare} className="space-y-6">
                        {embedded && (
                            <p className={`${dash.hint} -mt-1`}>
                                Pay with mobile money — funds arrive as {asset.toUpperCase()} in your wallet.
                            </p>
                        )}
                        {hasBackgroundDeposit && (
                            <div className="flex flex-col gap-2 rounded-xl border border-[var(--brand-accent)]/25 bg-[var(--brand-accent)]/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-white/80">You have a deposit in progress.</p>
                                <button
                                    type="button"
                                    onClick={() => resumeActiveDeposit()}
                                    className={`${dash.ctaSecondary} shrink-0 !py-2 !px-3 text-xs`}
                                >
                                    View status
                                </button>
                            </div>
                        )}
                        {errorMessage && <FormError>{errorMessage}</FormError>}
                        {asset === 'usdc' && usdcNeedsUnlock && walletCustody === 'self' && !walletReady && (
                            <WalletGateInline />
                        )}
                        {asset === 'usdc' && activationFiat > 0 && (
                            <p className={`${dash.hint} rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2`}>
                                One-time network setup: {formatFiat(activationFiat)} (~{activationXlm.toFixed(2)} XLM).
                                The XLM stays in your wallet to unlock USDC. Added to your mobile money charge once.
                            </p>
                        )}
                        {asset === 'usdc' &&
                            activationFiat <= 0 &&
                            usdcNeedsUnlock &&
                            walletCustody === 'self' &&
                            !walletReady && (
                            <p className={`${dash.hint} rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2`}>
                                Optional: unlock your wallet so USDC credits faster after mobile money approval.
                                You can still continue without unlocking now.
                            </p>
                        )}
                        {asset === 'usdc' && activationFiat > 0 && Number(amount || 0) > 0 && (
                            <p className={dash.hint}>
                                Total to approve: {formatFiat(Number(amount || 0) + activationFiat)}
                            </p>
                        )}
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className={dash.label}>Asset</label>
                                <select
                                    value={asset}
                                    onChange={(e) => {
                                        setAsset(e.target.value as 'xlm' | 'usdc');
                                        clearError();
                                    }}
                                    className={dash.select}
                                >
                                    <option value="xlm">XLM</option>
                                    <option value="usdc">USDC</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className={dash.label}>Deposit amount</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-white/45">
                                        {market.currency}
                                    </span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => {
                                            setAmount(e.target.value);
                                            clearError();
                                        }}
                                        className={`${dash.input} pl-14 font-semibold`}
                                        placeholder="0.00"
                                        min={minFiat}
                                        max={maxFiat}
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <p className={dash.hint}>
                                    ~{cryptoAmount.toFixed(asset === 'usdc' ? 2 : 4)} {asset.toUpperCase()} ·{' '}
                                    {formatFiat(minFiat)}–{formatFiat(maxFiat)}
                                </p>
                            </div>
                        </div>
                        {hasMobileMoney && (
                            <section className={`space-y-5 pt-2 ${dash.divider}`}>
                                <h3 className={dash.sectionTitle}>Mobile money</h3>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="space-y-2 sm:col-span-2">
                                        <label className={dash.label}>Mobile Network</label>
                                        <MobileOperatorPicker
                                            operators={market.mobileOperators}
                                            value={operator}
                                            onChange={(id) => {
                                                setOperator(id);
                                                clearError();
                                            }}
                                        />
                                        <p className={dash.hint}>
                                            Must match the network on your SIM (MTN 096/076, Airtel 097/077, Zamtel 095/075)
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={dash.label}>Mobile Number</label>
                                        <div className={dash.phoneGroup}>
                                            <span className={dash.phonePrefix}>{market.phoneDialCode}</span>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => {
                                                    setPhone(e.target.value);
                                                    clearError();
                                                }}
                                                className={dash.phoneInput}
                                                placeholder="97 123 4567"
                                                inputMode="tel"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        <button type="submit" disabled={isLoading} className={dash.ctaFull}>
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                            {isLoading ? 'Loading…' : 'Review deposit'}
                        </button>
                    </form>
                )}
            </div>

            {snapshot && (
                <DepositSuccessModal
                    isOpen={showSuccessModal}
                    onClose={() => {
                        setShowSuccessModal(false);
                        resetForm();
                    }}
                    amount={snapshot.amount}
                    asset={snapshot.asset}
                    cryptoAmount={snapshot.cryptoAmount}
                    formatFiat={formatFiat}
                    dialCode={market.phoneDialCode}
                    phoneDisplay={snapshot.phone}
                    operator={snapshot.operator}
                    activationFiat={snapshot.activationFiat}
                    activationXlm={snapshot.activationXlm}
                />
            )}
        </>
    );
}
