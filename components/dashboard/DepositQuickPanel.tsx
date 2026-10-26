'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Message } from '@/components/Message';
import { DepositStatusTracker, type DepositTrackStep } from '@/components/deposit/DepositStatusTracker';
import { useMarketRates } from '@/components/market/useMarketRates';
import { dash } from '@/lib/dashboard-ui';
import { formatPhoneE164ForMarket, localPhoneDisplayForMarket } from '@/lib/phone';
import type { MobileOperatorId } from '@/lib/markets';
import { MobileOperatorPicker } from '@/components/MobileOperatorPicker';
import { useWallet } from '@/components/wallet/WalletProvider';
import { WalletGateInline } from '@/components/wallet/WalletGateInline';
import { useRequireWalletUnlocked } from '@/components/wallet/useRequireWalletUnlocked';
import { prepareUsdcWallet } from '@/lib/usdc-deposit-client';
import {
    clearActiveDeposit,
    depositFailureCopy,
    mapConfirmToDepositStep,
    saveActiveDeposit,
} from '@/lib/deposit-track-ui';

const DEFAULT_RATES = { xlm: { buy: 3.5 }, usdc: { buy: 25 } } as const;

interface DepositQuickPanelProps {
    onSuccess?: () => void;
    className?: string;
}

function toFriendlyDepositError(msg?: string, httpStatus?: number): string {
    if (!msg) return 'Something went wrong. Please try again.';
    if (httpStatus === 401) return 'Please sign in again to continue.';
    const m = msg.toLowerCase();
    if (
        httpStatus === 503 ||
        m.includes('not available right now') ||
        m.includes('try again later or contact support')
    ) {
        return 'Deposits are not available right now. Please try again later or contact support.';
    }
    if (m.includes('minimum') || m.includes('maximum') || m.includes('phone') || m.includes('number')) return msg;
    if (m.includes('lenco') || m.includes('api credentials') || m.includes('api key')) return msg;
    if (m.includes('unlock your wallet') || (m.includes('usdc') && m.includes('trustline'))) return msg;
    return msg;
}

export function DepositQuickPanel({ onSuccess, className = '' }: DepositQuickPanelProps) {
    const { ensureUsdcReady, walletCustody } = useWallet();
    const { walletReady } = useRequireWalletUnlocked();
    const { market, rates: marketRates, limits, formatFiat, hasMobileMoney, defaultOperator } = useMarketRates();
    const [asset, setAsset] = useState<'xlm' | 'usdc'>('xlm');
    const [amount, setAmount] = useState('500');
    const [phone, setPhone] = useState('');
    const [operator, setOperator] = useState<MobileOperatorId>(defaultOperator);
    const [showDetails, setShowDetails] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPreparingUsdc, setIsPreparingUsdc] = useState(false);
    const [error, setError] = useState('');
    const [trackingRef, setTrackingRef] = useState<string | null>(null);
    const [depositStep, setDepositStep] = useState<DepositTrackStep>('awaiting_approval');
    const [activationFiat, setActivationFiat] = useState(0);
    const [activationXlm, setActivationXlm] = useState(0);

    const rates = marketRates ?? DEFAULT_RATES;
    const rate = rates[asset].buy;
    const cryptoAmount = Number(amount || 0) / rate;
    const isTracking = Boolean(trackingRef);

    const runUsdcPrep = useCallback(async () => {
        await prepareUsdcWallet({
            ensureUsdcReady,
            walletReady,
            allowDeferredActivation: true,
        }).catch(() => {});
    }, [ensureUsdcReady, walletReady]);

    useEffect(() => {
        setOperator(defaultOperator);
    }, [defaultOperator]);

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

    useEffect(() => {
        if (asset !== 'usdc') {
            setActivationFiat(0);
            setActivationXlm(0);
            return;
        }
        fetch('/api/deposit/activation?asset=usdc')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                const a = data?.activation;
                if (a?.required) {
                    setActivationFiat(Number(a.fiat) || 0);
                    setActivationXlm(Number(a.xlm) || 0);
                } else {
                    setActivationFiat(0);
                    setActivationXlm(0);
                }
            })
            .catch(() => {});
    }, [asset, walletReady]);

    useEffect(() => {
        if (asset !== 'usdc' || !walletReady || activationFiat > 0) return;
        runUsdcPrep();
    }, [asset, walletReady, runUsdcPrep, activationFiat]);

    useEffect(() => {
        if (!trackingRef) return;
        let cancelled = false;
        let tries = 0;

        const tick = async () => {
            if (cancelled) return;
            tries += 1;
            try {
                const res = await fetch('/api/deposit/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reference: trackingRef }),
                });
                const data = await res.json().catch(() => ({}));
                if (cancelled) return;
                const next = mapConfirmToDepositStep(data);
                if (!next) {
                    // keep polling
                } else if (next === 'complete') {
                    setDepositStep('complete');
                    clearActiveDeposit();
                    onSuccess?.();
                    return;
                } else if (next === 'failed') {
                    setDepositStep('failed');
                    setError(depositFailureCopy(data));
                    clearActiveDeposit();
                    return;
                } else {
                    setDepositStep(next);
                    if ((next === 'waiting_trustline' || next === 'crediting') && asset === 'usdc') {
                        runUsdcPrep();
                    }
                }
            } catch {
                // keep polling
            }
            if (!cancelled && tries < 90) {
                setTimeout(tick, 3000);
            }
        };

        tick();
        return () => {
            cancelled = true;
        };
    }, [trackingRef, asset, onSuccess, runUsdcPrep]);

    const resetTracking = () => {
        setTrackingRef(null);
        setDepositStep('awaiting_approval');
        setError('');
        clearActiveDeposit();
    };

    const handleSubmit = async () => {
        const amountNum = Number(amount);
        let fullPhone: string;
        try {
            fullPhone = formatPhoneE164ForMarket(phone, market.countryCode);
        } catch {
            setShowDetails(true);
            setError('Enter a valid mobile money number.');
            return;
        }

        if (!hasMobileMoney) {
            setError('Mobile money deposits are not available in your country yet.');
            return;
        }

        if (!amountNum || amountNum < limits.minDeposit) {
            setError(`Minimum deposit is ${formatFiat(limits.minDeposit)}.`);
            return;
        }
        if (amountNum > limits.maxDeposit) {
            setError(`Maximum deposit is ${formatFiat(limits.maxDeposit)} per transaction.`);
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            if (asset === 'usdc') {
                setIsPreparingUsdc(true);
                await runUsdcPrep();
            }

            const res = await fetch('/api/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amountNum, phone: fullPhone, operator, asset }),
            });
            const data = await res.json();

            if (res.ok && data.success !== false && typeof data.reference === 'string') {
                setDepositStep('awaiting_approval');
                setTrackingRef(data.reference);
                saveActiveDeposit({
                    reference: data.reference,
                    asset,
                    amount: amountNum,
                    phone,
                    operator,
                    cryptoAmount: amountNum / rate,
                    activationFiat,
                    activationXlm,
                });
            } else {
                setError(toFriendlyDepositError(data.error, res.status));
            }
        } catch {
            setError('Could not reach our servers. Please try again.');
        } finally {
            setIsLoading(false);
            setIsPreparingUsdc(false);
        }
    };

    if (isTracking) {
        return (
            <div className={`${dash.panelPadding} ${className}`}>
                <DepositStatusTracker
                    step={depositStep}
                    asset={asset}
                    reference={trackingRef || undefined}
                    errorMessage={depositStep === 'failed' ? error : undefined}
                    compact
                />
                {asset === 'usdc' &&
                    (depositStep === 'waiting_trustline' || depositStep === 'crediting') &&
                    walletCustody === 'self' &&
                    !walletReady && (
                        <div className="mt-3">
                            <WalletGateInline
                                message="Your payment succeeded. Unlock your wallet to receive USDC."
                                ctaLabel="Unlock to receive USDC"
                            />
                        </div>
                    )}
                <div className="mt-4">
                    {depositStep === 'failed' ? (
                        <button type="button" onClick={resetTracking} className={dash.ctaFull}>
                            Try again
                        </button>
                    ) : depositStep === 'complete' ? (
                        <button type="button" onClick={resetTracking} className={dash.ctaFull}>
                            Deposit more
                        </button>
                    ) : (
                        <p className="text-center text-[0.6875rem] text-white/35">
                            Approve on your phone — we update this status automatically.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    const chargeTotal = Number(amount || 0) + (asset === 'usdc' ? activationFiat : 0);

    return (
        <div className={`${dash.panelPadding} ${className}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h2 className={dash.heading}>Deposit</h2>
                    <p className={dash.hint}>Mobile money → crypto</p>
                </div>
            </div>

            {error && (
                <Message variant="warning" title="Notice" dark className="mb-3 !p-2.5">
                    {error}
                </Message>
            )}

            <div className={`${dash.panelInset} mb-2.5 p-3`}>
                <p className={dash.sectionLabel}>From</p>
                <div className="mt-2 flex items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-white">Local ({market.currency})</span>
                            <ChevronDown className="h-3.5 w-3.5 text-white/35" />
                        </div>
                        <p className="mt-1 text-xs text-white/35">Mobile money</p>
                    </div>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => {
                            setAmount(e.target.value);
                            setError('');
                        }}
                        className="w-24 border-0 bg-transparent text-right text-lg font-bold text-white tabular-nums outline-none focus:ring-0"
                        placeholder="0.00"
                        min={limits.minDeposit}
                        max={limits.maxDeposit}
                        step="0.01"
                    />
                </div>
            </div>

            <div className={`${dash.panelInset} mb-3 p-3`}>
                <p className={dash.sectionLabel}>To</p>
                <div className="mt-2 flex items-start justify-between gap-3">
                    <div>
                        <div className="relative inline-block">
                            <select
                                value={asset}
                                onChange={(e) => setAsset(e.target.value as 'xlm' | 'usdc')}
                                className="cursor-pointer appearance-none border-0 bg-transparent pr-5 text-sm font-semibold text-white outline-none"
                            >
                                <option value="xlm">XLM</option>
                                <option value="usdc">USDC</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
                        </div>
                        <p className="mt-1 text-xs text-white/35">
                            1 {asset.toUpperCase()} ≈ {rate.toFixed(2)} {market.currency}
                        </p>
                    </div>
                    <span className="text-lg font-bold text-white tabular-nums">
                        {cryptoAmount > 0 ? cryptoAmount.toFixed(2) : '0.00'}
                    </span>
                </div>
            </div>

            {asset === 'usdc' && activationFiat > 0 && (
                <p className={`${dash.hint} mb-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2`}>
                    + {formatFiat(activationFiat)} one-time network setup (~{activationXlm.toFixed(2)} XLM stays in
                    wallet). Total charge: {formatFiat(chargeTotal)}
                </p>
            )}

            {hasMobileMoney && (showDetails || !phone) && (
                <div className="mb-3 space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <div>
                        <label className={dash.sectionLabel}>Network</label>
                        <MobileOperatorPicker
                            operators={market.mobileOperators}
                            value={operator}
                            onChange={setOperator}
                            size="sm"
                            className="mt-2"
                        />
                    </div>
                    <div>
                        <label className={dash.sectionLabel}>Phone</label>
                        <div className={`${dash.phoneGroup} mt-2`}>
                            <span className={`${dash.phonePrefix} !py-2 text-xs`}>{market.phoneDialCode}</span>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className={`${dash.phoneInput} !min-h-[40px] !py-2 text-xs`}
                                placeholder="97 123 4567"
                            />
                        </div>
                    </div>
                </div>
            )}

            {!showDetails && phone && (
                <button
                    type="button"
                    onClick={() => setShowDetails(true)}
                    className="mb-3 text-xs text-white/40 hover:text-[var(--brand-accent)]"
                >
                    Change payment number
                </button>
            )}

            {isPreparingUsdc && (
                <p className={`${dash.hint} mb-3 flex items-center gap-2`}>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing your USDC wallet…
                </p>
            )}

            <button type="button" onClick={handleSubmit} disabled={isLoading} className={dash.ctaFull}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading
                    ? isPreparingUsdc
                        ? 'Preparing wallet…'
                        : 'Sending request…'
                    : activationFiat > 0
                      ? `Confirm · ${formatFiat(chargeTotal)}`
                      : 'Confirm deposit'}
            </button>
        </div>
    );
}
