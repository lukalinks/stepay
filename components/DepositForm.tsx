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

function toFriendlyDepositError(msg?: string, httpStatus?: number): string {
    if (!msg) return 'Something went wrong. Please try again in a moment.';
    if (httpStatus === 401) return 'Please sign in again to continue.';
    const m = msg.toLowerCase();
    if (m.includes('minimum') || m.includes('maximum') || m.includes('first deposit')) return msg;
    if (m.includes('mobile') || m.includes('phone') || m.includes('number')) return msg;
    if (m.includes('lenco') || m.includes('api credentials') || m.includes('api key') || m.includes('unauthorized')) return msg;
    if (m.includes('account details') || m.includes('mobile money wallet')) return msg;
    if (m.includes('does not match the selected network')) return msg;
    if (m.includes('collection') || m.includes('mobile money')) return msg;
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
};

interface DepositFormProps {
    onSuccess?: () => void;
    compact?: boolean;
    /** Hide title row when wrapped in DashboardPanel */
    embedded?: boolean;
}

export function DepositForm({ onSuccess, compact, embedded }: DepositFormProps) {
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
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const completedRef = useRef(false);
    const rates = marketRates ?? DEFAULT_RATES;

    const rate = rates[asset].buy;
    const minFiat = limits.minDeposit;
    const maxFiat = limits.maxDeposit;
    const cryptoAmount = Number(amount || 0) / rate;

    useEffect(() => {
        const onFocus = () => fetchRates();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [fetchRates]);

    useEffect(() => {
        setOperator(defaultOperator);
    }, [defaultOperator]);

    useEffect(() => {
        fetch('/api/user')
            .then((res) => res.ok ? res.json() : null)
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

    const resetForm = useCallback(() => {
        setPhase('form');
        setLastReference('');
        setDepositStep('awaiting_approval');
        setSnapshot(null);
        setShowSuccessModal(false);
        setErrorMessage('');
        completedRef.current = false;
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    }, []);

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
            setErrorMessage('Mobile money deposits are not available in your country yet.');
            return null;
        }
        return {
            amount: amountNum,
            asset,
            phone,
            operator,
            cryptoAmount: amountNum / rate,
        };
    };

    const handlePrepare = (e: React.FormEvent) => {
        e.preventDefault();
        const data = validateAndBuildSnapshot();
        if (!data) return;
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
                setLastReference(data.reference || '');
                setDepositStep('awaiting_approval');
                completedRef.current = false;
                setPhase('tracking');
            } else {
                setErrorMessage(toFriendlyDepositError(data.error, res.status));
            }
        } catch {
            setErrorMessage('We couldn\'t reach our servers. Please check your internet connection and try again.');
        } finally {
            setIsLoading(false);
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

                    if (data.status === 'waiting_trustline') {
                        setDepositStep('waiting_trustline');
                        return;
                    }
                    if (data.status === 'failed') {
                        setDepositStep('failed');
                        setErrorMessage('Your deposit could not be completed. Please try again or contact support.');
                        if (pollIntervalRef.current) {
                            clearInterval(pollIntervalRef.current);
                            pollIntervalRef.current = null;
                        }
                        return;
                    }
                    if (data.completed || data.status === 'completed') {
                        setDepositStep('complete');
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
    }, [phase, lastReference, onSuccess]);

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
                        onConfirm={handleConfirmDeposit}
                        onCancel={() => {
                            setPhase('form');
                            setErrorMessage('');
                        }}
                        isLoading={isLoading}
                        error={errorMessage}
                    />
                ) : phase === 'tracking' && snapshot ? (
                    <div className="space-y-6 py-2">
                        <DepositStatusTracker
                            step={depositStep}
                            asset={snapshot.asset}
                            reference={lastReference}
                            errorMessage={depositStep === 'failed' ? errorMessage : undefined}
                        />
                        <div className="flex flex-col gap-2 sm:flex-row">
                            {depositStep === 'failed' ? (
                                <button type="button" onClick={resetForm} className={`${dash.ctaFull} flex-1`}>
                                    Try again
                                </button>
                            ) : depositStep === 'complete' ? (
                                <button type="button" onClick={resetForm} className={`${dash.ctaFull} flex-1`}>
                                    Deposit more
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className={`${dash.ctaSecondary} flex-1`}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handlePrepare} className="space-y-6">
                        {embedded && (
                            <p className={`${dash.hint} -mt-1`}>
                                Pay with mobile money — funds arrive as {asset.toUpperCase()} in your wallet.
                            </p>
                        )}
                        {errorMessage && <FormError>{errorMessage}</FormError>}
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
                />
            )}
        </>
    );
}
