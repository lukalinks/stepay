'use client';

import { useState, useEffect } from 'react';
import { ArrowUpRight, Loader2, CheckCircle } from 'lucide-react';
import { FormError } from '@/components/dashboard/FormError';
import { Message } from '@/components/Message';
import { ConfirmStep } from '@/components/dashboard/ConfirmStep';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';
import { dash } from '@/lib/dashboard-ui';
import { confirmDeliveryHint } from '@/lib/confirm-ui';
import { runSignedConfirmFlow } from '@/lib/client-confirm-flow';
import { BackupNudge } from '@/components/wallet/BackupNudge';
import { WalletGateInline } from '@/components/wallet/WalletGateInline';
import { useRequireWalletUnlocked } from '@/components/wallet/useRequireWalletUnlocked';
import { useMarketRates } from '@/components/market/useMarketRates';
import { formatPhoneE164ForMarket } from '@/lib/phone';
import type { MobileOperatorId } from '@/lib/markets';
import { MobileOperatorPicker, MobileOperatorBadge } from '@/components/MobileOperatorPicker';
import { parsePositiveDecimal, sanitizeDecimalInput } from '@/lib/parse-amount';

function toFriendlySellError(msg?: string): string {
    if (!msg) return 'Something went wrong. Please try again in a moment.';
    const m = msg.toLowerCase();
    if (m.includes('insufficient') || m.includes('balance')) return msg;
    if (m.includes('minimum') || m.includes('maximum')) return msg;
    if (m.includes('valid amount to cash out') || m.includes('positive number')) return 'Enter a valid amount greater than zero.';
    if (m.includes('invalid amount')) return 'Could not verify the transaction amount. Please start cash out again.';
    if (m.includes('keep') && m.includes('xlm')) return msg;
    if (m.includes('wallet')) return 'Your wallet couldn\'t be found. Please contact support.';
    if (m.includes('payout') || m.includes('lenco')) return 'We couldn\'t send the cash to your phone right now. Your crypto is safe—please try again or contact support.';
    if (m.includes('mobile') || m.includes('phone') || m.includes('number')) return msg;
    if (m.includes('unauthorized')) return 'Please sign in again to continue.';
    return msg;
}

const DEFAULT_RATES = { xlm: { sell: 3.5 }, usdc: { sell: 25 } } as const;

export default function SellPage() {
    const { canProceed, needsUnlock } = useRequireWalletUnlocked();
    const { market, rates: marketRates, fees, limits, fetchRates, formatFiat, hasMobileMoney, defaultOperator } = useMarketRates();
    const [asset, setAsset] = useState<'xlm' | 'usdc'>('xlm');
    const [amount, setAmount] = useState('');
    const [phone, setPhone] = useState('');
    const [operator, setOperator] = useState<MobileOperatorId>(defaultOperator);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'form' | 'confirm'>('form');
    const [intentId, setIntentId] = useState('');
    const [devHint, setDevHint] = useState<string | undefined>();
    const [deliveryHint, setDeliveryHint] = useState<string | undefined>();
    const [confirmCode, setConfirmCode] = useState('');
    const [isSigning, setIsSigning] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const rates = marketRates ?? DEFAULT_RATES;

    useEffect(() => {
        setOperator(defaultOperator);
    }, [defaultOperator]);

    useEffect(() => {
        const onFocus = () => fetchRates();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [fetchRates]);

    const rate = rates[asset].sell;
    const feeMult = 1 - fees.sellPercent / 100;
    const fiatPerUnit = rate > 0 ? rate * feeMult : 0;
    const minCrypto = fiatPerUnit > 0 ? limits.minWithdraw / fiatPerUnit : undefined;
    const maxCrypto = fiatPerUnit > 0 ? limits.maxWithdraw / fiatPerUnit : undefined;

    const handlePrepare = async (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = parsePositiveDecimal(amount);
        if (amountNum == null) {
            setError('Please enter how much you\'d like to cash out.');
            return;
        }
        const fiatReceived = amountNum * fiatPerUnit;
        if (fiatReceived < limits.minWithdraw) {
            const minHint = minCrypto != null ? ` (about ${minCrypto.toFixed(asset === 'usdc' ? 2 : 4)} ${asset.toUpperCase()})` : '';
            setError(`Cash outs start at ${formatFiat(limits.minWithdraw)}${minHint}.`);
            return;
        }
        if (fiatReceived > limits.maxWithdraw) {
            const maxHint = maxCrypto != null ? ` (about ${maxCrypto.toFixed(asset === 'usdc' ? 2 : 4)} ${asset.toUpperCase()})` : '';
            setError(`We allow up to ${formatFiat(limits.maxWithdraw)} per cash out${maxHint}. You can make multiple withdrawals if needed.`);
            return;
        }
        const phoneDigits = phone.replace(/\s+/g, '').replace(/\D/g, '');
        let fullPhone: string;
        try {
            fullPhone = formatPhoneE164ForMarket(phoneDigits.replace(/^0/, ''), market.countryCode);
        } catch {
            setError(`Please enter the mobile money number where you'd like to receive your payout.`);
            return;
        }
        if (!phoneDigits || phoneDigits.length < 9) {
            setError(`Please enter the mobile money number where you'd like to receive your payout.`);
            return;
        }
        if (!hasMobileMoney) {
            setError('Mobile money payouts are not available in your country yet.');
            return;
        }
        if (!canProceed()) {
            return;
        }
        setIsLoading(true);
        setError('');
        setStatus('idle');

        try {
            const res = await fetch('/api/sell/intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amountNum, asset, phone: fullPhone, operator }),
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok && data.success) {
                setIntentId(data.intentId);
                setDevHint(data.devConfirmCode);
                setDeliveryHint(confirmDeliveryHint(data));
                setConfirmCode('');
                setStep('confirm');
            } else {
                setStatus('error');
                setError(toFriendlySellError(data.error || data.message));
            }
        } catch (err) {
            console.error(err);
            setStatus('error');
            setError('We couldn\'t reach our servers. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = async () => {
        setIsLoading(true);
        setError('');
        try {
            const result = await runSignedConfirmFlow({
                confirmUrl: '/api/sell/confirm',
                finalizeUrl: '/api/sell/finalize',
                intentId,
                confirmCode,
                onSigning: () => setIsSigning(true),
            });
            setIsSigning(false);
            if (result.ok && result.data.success !== false) {
                setStatus('success');
                setMessage(String(result.data.message || `Cashed out ${amount} ${asset.toUpperCase()} successfully.`));
                setStep('form');
            } else {
                setStatus('error');
                setError(toFriendlySellError(String(result.ok ? result.data.error : result.error)));
            }
        } catch (err) {
            console.error(err);
            setIsSigning(false);
            setStatus('error');
            setError('We couldn\'t reach our servers. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSell = handlePrepare;

    return (
        <DashboardPanel>
            <div className={dash.panelPadding}>
                {status === 'success' ? (
                    <div className="text-center py-6">
                        <div className={dash.successIcon}>
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">You're all set!</h3>
                        <p className="text-white/55 mb-6">Your cash is on its way. {message}</p>
                        <button
                            onClick={() => { setStatus('idle'); setAmount(''); setPhone(''); setMessage(''); }}
                            className={dash.ctaSecondary}
                        >
                            Cash Out More
                        </button>
                    </div>
                ) : step === 'confirm' ? (
                    <ConfirmStep
                        title="Confirm cash out"
                        summary={
                            <>
                                Cash out <strong className="text-white">{amount} {asset.toUpperCase()}</strong> (≈ {formatFiat(Number(parsePositiveDecimal(amount) ?? 0) * fiatPerUnit)}) to{' '}
                                <strong className="text-white">{market.phoneDialCode}{phone.replace(/\D/g, '')}</strong>{' '}
                                via <MobileOperatorBadge operatorId={operator} />
                            </>
                        }
                        confirmCode={confirmCode}
                        onConfirmCodeChange={setConfirmCode}
                        onConfirm={handleConfirm}
                        onCancel={() => {
                            setStep('form');
                            setConfirmCode('');
                            setError('');
                        }}
                        isLoading={isLoading}
                        error={error}
                        devHint={devHint}
                        deliveryHint={isSigning ? 'Signing with your wallet…' : deliveryHint}
                        showConfirmSteps
                    />
                ) : (
                    <form onSubmit={handleSell} className="space-y-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className={dash.label}>Asset</label>
                                <select
                                    value={asset}
                                    onChange={(e) => { setAsset(e.target.value as 'xlm' | 'usdc'); setError(''); }}
                                    className={dash.select}
                                >
                                    <option value="xlm">XLM</option>
                                    <option value="usdc">USDC</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className={dash.label}>Amount ({asset.toUpperCase()})</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={amount}
                                        onChange={(e) => { setAmount(sanitizeDecimalInput(e.target.value)); setError(''); }}
                                        className={`${dash.input} pr-16 font-semibold`}
                                        placeholder={asset === 'usdc' ? '0.00' : '0.0000'}
                                        autoComplete="off"
                                        required
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 font-medium text-sm">{asset.toUpperCase()}</span>
                                </div>
                                <p className={dash.hint}>
                                    ≈ {formatFiat(Number(parsePositiveDecimal(amount) ?? 0) * fiatPerUnit)} · {formatFiat(limits.minWithdraw)}–{formatFiat(limits.maxWithdraw)}
                                    {minCrypto != null ? ` · min ~${minCrypto.toFixed(asset === 'usdc' ? 2 : 4)} ${asset.toUpperCase()}` : ''}
                                </p>
                            </div>
                        </div>
                        {hasMobileMoney && (
                        <div className={`grid gap-5 sm:grid-cols-2 pt-2 ${dash.divider}`}>
                            <div className="space-y-2 sm:col-span-2">
                                <label className={dash.label}>Mobile Network</label>
                                <MobileOperatorPicker
                                    operators={market.mobileOperators}
                                    value={operator}
                                    onChange={(id) => { setOperator(id); setError(''); }}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={dash.label}>Mobile Number</label>
                                <div className={dash.phoneGroup}>
                                    <span className={dash.phonePrefix}>{market.phoneDialCode}</span>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => { setPhone(e.target.value); setError(''); }}
                                        className={dash.phoneInput}
                                        placeholder="97 123 4567"
                                        inputMode="tel"
                                        required
                                    />
                                </div>
                                <p className={`${dash.hint} mt-1`}>Mobile money payout</p>
                            </div>
                        </div>
                        )}

                        <Message variant="info" title="How it works" dark>
                            We&apos;ll convert your crypto to local currency and send it straight to your mobile money. Funds usually arrive within a few minutes.
                        </Message>

                        <BackupNudge />
                        {needsUnlock && <WalletGateInline />}
                        <FormError>{error}</FormError>

                        <button type="submit" disabled={isLoading} className={dash.ctaFull}>
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUpRight className="w-5 h-5" />}
                            {isLoading ? 'Preparing…' : 'Review cash out'}
                        </button>
                    </form>
                )}
            </div>
        </DashboardPanel>
    );
}
