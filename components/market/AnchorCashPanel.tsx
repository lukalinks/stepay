'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    CheckCircle,
    Copy,
    ExternalLink,
    Loader2,
    MapPin,
    ShieldCheck,
    X,
} from 'lucide-react';
import { dash } from '@/lib/dashboard-ui';
import type { MarketConfig } from '@/lib/markets';
import { getUnlockedSecret, isWalletUnlocked } from '@/lib/client-wallet';
import { useWallet } from '@/components/wallet/WalletProvider';
import { WalletGateInline } from '@/components/wallet/WalletGateInline';
import {
    pollPartnerTransaction,
    sendPartnerWithdrawalPayment,
    startPartnerCheckout,
    type Sep24TxStatus,
} from '@/lib/sep24-client';
import { parsePositiveDecimal, sanitizeDecimalInput } from '@/lib/parse-amount';

type Step = 'form' | 'confirm' | 'partner' | 'tracking' | 'pickup' | 'done';

type FlowSession = {
    id: string;
    token: string;
    url: string;
    kind: 'deposit' | 'withdraw';
    amount: string;
    partnerName: string;
    assetCode: string;
    networkPassphrase: string;
    stellarTxHash?: string;
    pickupCode?: string;
    moreInfoUrl?: string;
};

const STORAGE_KEY = 'stepay.sep24.flow';
const AGENT_FINDER = 'https://www.moneygram.com/mgo/us/en/l/locations';

function loadSession(): FlowSession | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as FlowSession;
        if (!parsed?.id || !parsed?.token) return null;
        return parsed;
    } catch {
        return null;
    }
}

function saveSession(session: FlowSession | null) {
    try {
        if (!session) sessionStorage.removeItem(STORAGE_KEY);
        else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
        /* ignore */
    }
}

function statusLabel(status: string, kind: 'deposit' | 'withdraw'): string {
    switch (status) {
        case 'incomplete':
            return kind === 'withdraw' ? 'Finish setup on MoneyGram…' : 'Finish setup on MoneyGram…';
        case 'pending_user_transfer_start':
            return kind === 'withdraw' ? 'Ready to send USDC' : 'Pay cash at a MoneyGram agent';
        case 'pending_user_transfer_complete':
            return kind === 'withdraw' ? 'Pickup code ready' : 'Waiting for USDC…';
        case 'pending_anchor':
            return 'MoneyGram is processing…';
        case 'completed':
            return 'Completed';
        case 'expired':
            return 'Expired';
        case 'refunded':
            return 'Refunded';
        case 'error':
        case 'no_market':
        case 'too_small':
        case 'too_large':
            return 'Could not complete';
        default:
            return status.replace(/_/g, ' ');
    }
}

function ProgressDots({
    active,
}: {
    active: 'amount' | 'partner' | 'send' | 'pickup';
}) {
    const steps = [
        { id: 'amount', label: 'Amount' },
        { id: 'partner', label: 'MoneyGram' },
        { id: 'send', label: 'Send' },
        { id: 'pickup', label: 'Pickup' },
    ] as const;
    const idx = steps.findIndex((s) => s.id === active);
    return (
        <ol className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/35">
            {steps.map((s, i) => (
                <li key={s.id} className="flex items-center gap-1.5">
                    {i > 0 && <span className="h-px w-3 bg-white/10" aria-hidden />}
                    <span className={i <= idx ? 'text-[var(--brand-accent)]' : ''}>{s.label}</span>
                </li>
            ))}
        </ol>
    );
}

export function AnchorCashPanel({
    market,
    kind,
}: {
    market: MarketConfig;
    kind: 'deposit' | 'withdraw';
}) {
    const { unlocked, requestUnlock } = useWallet();
    const [amount, setAmount] = useState('');
    const [step, setStep] = useState<Step>('form');
    const [session, setSession] = useState<FlowSession | null>(null);
    const [tx, setTx] = useState<Sep24TxStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [minUsdc, setMinUsdc] = useState(2);
    const [maxUsdc, setMaxUsdc] = useState<number | undefined>(undefined);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const partner = market.anchor?.partnerName || 'MoneyGram';
    const isMoneyGram = partner.toLowerCase().includes('moneygram');
    const isWithdraw = kind === 'withdraw';

    const stopPoll = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const applyTx = useCallback(
        (transaction: Sep24TxStatus, current: FlowSession) => {
            setTx(transaction);
            const pickup =
                transaction.external_transaction_id ||
                current.pickupCode ||
                undefined;
            const next: FlowSession = {
                ...current,
                pickupCode: pickup,
                moreInfoUrl: transaction.more_info_url || current.moreInfoUrl,
            };
            setSession(next);
            saveSession(next);

            if (
                transaction.status === 'pending_user_transfer_complete' ||
                (pickup && transaction.status === 'completed')
            ) {
                if (isWithdraw && pickup) {
                    setStep('pickup');
                    stopPoll();
                    return;
                }
            }
            if (transaction.status === 'completed' && !isWithdraw) {
                setStep('done');
                stopPoll();
                return;
            }
            if (
                ['expired', 'refunded', 'error', 'no_market', 'too_small', 'too_large'].includes(
                    transaction.status
                )
            ) {
                setError(transaction.message || statusLabel(transaction.status, kind));
                stopPoll();
            }
        },
        [isWithdraw, kind, stopPoll]
    );

    const refreshStatus = useCallback(
        async (current: FlowSession) => {
            try {
                const { transaction, networkPassphrase } = await pollPartnerTransaction({
                    id: current.id,
                    token: current.token,
                });
                const withNet = {
                    ...current,
                    networkPassphrase: networkPassphrase || current.networkPassphrase,
                };
                applyTx(transaction, withNet);
            } catch (e) {
                // Keep polling on transient errors
                console.warn('SEP-24 poll:', e);
            }
        },
        [applyTx]
    );

    const startPolling = useCallback(
        (current: FlowSession) => {
            stopPoll();
            void refreshStatus(current);
            pollRef.current = setInterval(() => void refreshStatus(current), 4000);
        },
        [refreshStatus, stopPoll]
    );

    useEffect(() => {
        const existing = loadSession();
        if (existing && existing.kind === kind) {
            setSession(existing);
            setAmount(existing.amount || '');
            if (existing.pickupCode) setStep('pickup');
            else {
                setStep('tracking');
                startPolling(existing);
            }
        }
        return () => stopPoll();
        // Resume once per mount / kind — avoid re-binding poll loop
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kind]);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/sep24/config', { credentials: 'include' })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (cancelled || !data?.assetLimits) return;
                const limits = isWithdraw ? data.assetLimits.withdraw : data.assetLimits.deposit;
                const min = Number(limits?.min);
                const max = Number(limits?.max);
                if (Number.isFinite(min) && min > 0) setMinUsdc(min);
                if (Number.isFinite(max) && max > 0) setMaxUsdc(max);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [isWithdraw]);

    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            const data = event.data;
            if (!data || typeof data !== 'object') return;
            if (data.type === 'COMMIT_RESULT' && data.payload?.transaction) {
                const transaction = data.payload.transaction as Sep24TxStatus;
                if (session) {
                    setSheetOpen(false);
                    setStep('tracking');
                    applyTx(transaction, session);
                    startPolling(session);
                }
            }
            if (data.transaction?.status === 'pending_user_transfer_start' && session) {
                setSheetOpen(false);
                setStep('tracking');
                applyTx(data.transaction as Sep24TxStatus, session);
                startPolling(session);
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [applyTx, session, startPolling]);

    const ensureUnlocked = () => {
        if (!isWalletUnlocked() && !unlocked) {
            requestUnlock?.();
            setError('Unlock your wallet first.');
            return false;
        }
        return true;
    };

    const goConfirm = () => {
        setError(null);
        const amt = parsePositiveDecimal(amount);
        if (amt == null || amt <= 0) {
            setError(`Enter how much USDC you want to ${isWithdraw ? 'cash out' : 'cash in'}.`);
            return;
        }
        if (amt < minUsdc) {
            setError(`MoneyGram’s minimum is ${minUsdc} USDC.`);
            return;
        }
        if (maxUsdc != null && amt > maxUsdc) {
            setError(`MoneyGram’s maximum is ${maxUsdc} USDC.`);
            return;
        }
        if (!ensureUnlocked()) return;
        setStep('confirm');
    };

    const openPartner = async () => {
        if (!ensureUnlocked()) return;
        setLoading(true);
        setError(null);
        try {
            const secret = getUnlockedSecret();
            const amt = parsePositiveDecimal(amount);
            if (amt == null || amt < minUsdc) {
                setError(`MoneyGram’s minimum is ${minUsdc} USDC.`);
                return;
            }
            const result = await startPartnerCheckout({
                secretKey: secret,
                kind,
                amount: amt,
            });
            const next: FlowSession = {
                id: result.id,
                token: result.token,
                url: result.url,
                kind,
                amount: amount.trim(),
                partnerName: result.partnerName,
                assetCode: result.assetCode,
                networkPassphrase: result.networkPassphrase,
            };
            setSession(next);
            saveSession(next);
            setStep('partner');
            setSheetOpen(true);
            startPolling(next);
            if (typeof window !== 'undefined') {
                window.open(next.url, 'stepay-moneygram', 'noopener,noreferrer');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not open MoneyGram');
            setStep('confirm');
        } finally {
            setLoading(false);
        }
    };

    const confirmSend = async () => {
        if (!session || !tx) return;
        if (!ensureUnlocked()) return;
        if (tx.status !== 'pending_user_transfer_start') {
            setError('MoneyGram is not ready for the USDC send yet.');
            return;
        }
        setSending(true);
        setError(null);
        try {
            const secret = getUnlockedSecret();
            const hash = await sendPartnerWithdrawalPayment({
                secretKey: secret,
                transaction: tx,
                networkPassphrase: session.networkPassphrase,
            });
            const next = { ...session, stellarTxHash: hash };
            setSession(next);
            saveSession(next);
            setStep('tracking');
            startPolling(next);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not send USDC');
        } finally {
            setSending(false);
        }
    };

    const reset = () => {
        stopPoll();
        saveSession(null);
        setSession(null);
        setTx(null);
        setAmount('');
        setStep('form');
        setError(null);
        setSheetOpen(false);
    };

    const copyPickup = async () => {
        const code = session?.pickupCode || tx?.external_transaction_id;
        if (!code) return;
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setError('Could not copy. Long-press the code instead.');
        }
    };

    const readyToSend =
        isWithdraw && tx?.status === 'pending_user_transfer_start' && !session?.stellarTxHash;
    const waitingAfterSend =
        isWithdraw &&
        Boolean(session?.stellarTxHash) &&
        tx?.status !== 'pending_user_transfer_complete' &&
        tx?.status !== 'completed';
    const depositWaitAgent = !isWithdraw && tx?.status === 'pending_user_transfer_start';

    const progressActive =
        step === 'form' || step === 'confirm'
            ? 'amount'
            : step === 'partner'
              ? 'partner'
              : readyToSend || waitingAfterSend || step === 'tracking'
                ? 'send'
                : 'pickup';

    /* ── Pickup hero ── */
    if (step === 'pickup' && (session?.pickupCode || tx?.external_transaction_id)) {
        const code = session?.pickupCode || tx?.external_transaction_id || '';
        return (
            <div className={`${dash.panelPadding} space-y-5`}>
                <ProgressDots active="pickup" />
                <div className="text-center py-2">
                    <div className={dash.successIcon}>
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <p className={dash.sectionLabel}>Your pickup code</p>
                    <p className="mt-3 font-mono text-3xl sm:text-4xl font-bold tracking-[0.12em] text-white break-all">
                        {code}
                    </p>
                    <p className="mt-3 text-sm text-white/55">
                        Show this at any {partner} agent in {market.countryName}
                        {session?.amount ? ` · ${session.amount} USDC` : ''}
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={copyPickup} className={dash.ctaFull}>
                        <Copy className="h-4 w-4" />
                        {copied ? 'Copied' : 'Copy code'}
                    </button>
                    <a
                        href={session?.moreInfoUrl || AGENT_FINDER}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${dash.ctaSecondary} w-full justify-center`}
                    >
                        <MapPin className="h-4 w-4" />
                        Find an agent
                    </a>
                </div>
                <button type="button" onClick={reset} className={`${dash.ctaGhost} w-full justify-center`}>
                    Done
                </button>
            </div>
        );
    }

    /* ── Deposit done ── */
    if (step === 'done') {
        return (
            <div className={`${dash.panelPadding} text-center py-6 space-y-4`}>
                <div className={dash.successIcon}>
                    <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">You&apos;re all set!</h3>
                <p className="text-white/55">
                    USDC from {partner} should appear in your Stepay wallet shortly.
                </p>
                <button type="button" onClick={reset} className={dash.ctaSecondary}>
                    Cash in more
                </button>
            </div>
        );
    }

    /* ── Confirm checklist ── */
    if (step === 'confirm') {
        return (
            <div className={`${dash.panelPadding} space-y-5`}>
                <ProgressDots active="amount" />
                <div className={`${dash.panelInset} space-y-3 p-4`}>
                    <div className="flex items-center gap-2 text-[var(--brand-accent)]">
                        <ShieldCheck className="h-5 w-5 shrink-0" />
                        <p className="text-sm font-bold text-white">
                            {isWithdraw ? 'Confirm cash out' : 'Confirm cash in'}
                        </p>
                    </div>
                    <p className="text-sm text-white/60">
                        {isWithdraw ? (
                            <>
                                Cash out <strong className="text-white">{amount} USDC</strong> via{' '}
                                {partner} agents in {market.countryName}.
                            </>
                        ) : (
                            <>
                                Cash in <strong className="text-white">{amount} USDC</strong> at a{' '}
                                {partner} agent in {market.countryName}.
                            </>
                        )}
                    </p>
                    <ul className="space-y-2 text-sm text-white/50 list-disc pl-5">
                        <li>You&apos;ll open {partner} to finish details and KYC</li>
                        <li>Bring a valid ID to the agent</li>
                        {isWithdraw && (
                            <li>USDC leaves your wallet only after you confirm send in Stepay</li>
                        )}
                    </ul>
                </div>
                {!unlocked && <WalletGateInline />}
                {error && <p className={dash.formError}>{error}</p>}
                <button type="button" onClick={openPartner} disabled={loading} className={dash.ctaFull}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ExternalLink className="h-5 w-5" />}
                    {loading ? 'Opening…' : `Continue with ${partner}`}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setStep('form');
                        setError(null);
                    }}
                    className={`${dash.ctaGhost} w-full justify-center`}
                >
                    Back
                </button>
            </div>
        );
    }

    /* ── Tracking / send ── */
    if (step === 'partner' || step === 'tracking') {
        return (
            <div className={`${dash.panelPadding} space-y-5`}>
                <ProgressDots active={progressActive === 'amount' ? 'partner' : progressActive} />

                <div className="space-y-1">
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                        <span aria-hidden>{market.flagEmoji}</span>
                        {isWithdraw ? 'Cash out' : 'Cash in'} · {partner}
                    </p>
                    <p className={dash.hint}>
                        {tx
                            ? statusLabel(tx.status, kind)
                            : isMoneyGram
                              ? 'On MoneyGram: set country to United States, look up a location, then Continue. Pickup total appears after you pick an agent.'
                              : 'Waiting for MoneyGram…'}
                    </p>
                </div>

                {session?.amount && (
                    <div className={`${dash.panelInset} px-4 py-3 flex justify-between text-sm`}>
                        <span className="text-white/45">Amount</span>
                        <span className="font-semibold text-white tabular-nums">{session.amount} USDC</span>
                    </div>
                )}

                {readyToSend && (
                    <div className="space-y-3">
                        <p className="text-sm text-white/60">
                            MoneyGram is ready. Confirm to send{' '}
                            <strong className="text-white">{tx?.amount_in || session?.amount} USDC</strong>{' '}
                            from your wallet (with their memo).
                        </p>
                        <button
                            type="button"
                            onClick={confirmSend}
                            disabled={sending}
                            className={dash.ctaFull}
                        >
                            {sending ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <ShieldCheck className="h-5 w-5" />
                            )}
                            {sending ? 'Sending…' : 'Confirm & send USDC'}
                        </button>
                    </div>
                )}

                {waitingAfterSend && (
                    <div className={`${dash.panelInset} p-4 text-sm text-white/55 space-y-2`}>
                        <p className="flex items-center gap-2 text-white">
                            <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-accent)]" />
                            Sent · waiting for MoneyGram
                        </p>
                        <p>Your pickup code will appear here when MoneyGram confirms.</p>
                    </div>
                )}

                {depositWaitAgent && (
                    <div className={`${dash.panelInset} p-4 text-sm text-white/55 space-y-2`}>
                        <p className="text-white font-medium">Pay cash at a {partner} agent</p>
                        <p>Use the instructions from MoneyGram. USDC will land in your Stepay wallet after they confirm.</p>
                        {tx?.more_info_url && (
                            <a
                                href={tx.more_info_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={dash.accentLink}
                            >
                                Open MoneyGram details
                            </a>
                        )}
                    </div>
                )}

                {!readyToSend && !waitingAfterSend && !depositWaitAgent && (
                    <div className="flex items-center gap-2 text-sm text-white/45">
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-accent)]" />
                        {tx?.status === 'incomplete'
                            ? `Complete the flow in ${partner}, then return here.`
                            : 'Checking status…'}
                    </div>
                )}

                {error && <p className={dash.formError}>{error}</p>}

                <div className="flex flex-col gap-2 sm:flex-row">
                    {session?.url && (
                        <button
                            type="button"
                            onClick={() => setSheetOpen(true)}
                            className={`${dash.ctaSecondary} flex-1 justify-center`}
                        >
                            <ExternalLink className="h-4 w-4" />
                            Open {partner} again
                        </button>
                    )}
                    <button type="button" onClick={reset} className={`${dash.ctaGhost} flex-1 justify-center`}>
                        Cancel
                    </button>
                </div>

                {sheetOpen && session?.url && (
                    <PartnerSheet
                        title={`${isWithdraw ? 'Cash out' : 'Cash in'} · ${partner}`}
                        url={session.url}
                        isWithdraw={isWithdraw}
                        onClose={() => {
                            setSheetOpen(false);
                            setStep('tracking');
                        }}
                    />
                )}
            </div>
        );
    }

    /* ── Amount form ── */
    return (
        <div className={`${dash.panelPadding} space-y-5`}>
            <ProgressDots active="amount" />
            <div className="space-y-1">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <span aria-hidden>{market.flagEmoji}</span>
                    {isWithdraw ? 'Cash out' : 'Cash in'}
                </p>
                <p className={dash.hint}>
                    {isMoneyGram
                        ? `${isWithdraw ? 'Pick up cash' : 'Pay cash'} at ${partner} agents in ${market.countryName} · USDC`
                        : `Hosted by ${partner}`}
                </p>
            </div>

            <div className="space-y-2">
                <label className={dash.label}>Amount (USDC)</label>
                <div className="relative">
                    <input
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => {
                            setAmount(sanitizeDecimalInput(e.target.value));
                            setError(null);
                        }}
                        className={`${dash.input} pr-16 font-semibold`}
                        placeholder={String(minUsdc)}
                        autoComplete="off"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 font-medium text-sm">
                        USDC
                    </span>
                </div>
                <p className={dash.hint}>
                    {isWithdraw
                        ? `Minimum ${minUsdc} USDC · you’ll confirm send in Stepay before USDC leaves`
                        : `Minimum ${minUsdc} USDC · you’ll get USDC after paying cash`}
                </p>
            </div>

            <div className={`${dash.panelInset} px-4 py-3 text-sm text-white/50`}>
                <span className="text-white/70 font-medium">Destination</span>
                <p className="mt-1">{partner} agent · {market.countryName}</p>
            </div>

            {!unlocked && <WalletGateInline />}
            {error && <p className={dash.formError}>{error}</p>}

            <button type="button" onClick={goConfirm} className={dash.ctaFull}>
                Review {isWithdraw ? 'cash out' : 'cash in'}
            </button>
        </div>
    );
}

function PartnerSheet({
    title,
    url,
    isWithdraw,
    onClose,
}: {
    title: string;
    url: string;
    isWithdraw: boolean;
    onClose: () => void;
}) {
    useEffect(() => {
        window.open(url, 'stepay-moneygram', 'noopener,noreferrer,width=480,height=840');
    }, [url]);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 backdrop-blur-sm sm:items-center">
            <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#121212] p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:bg-white/10"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <p className="text-sm text-white/60">
                    MoneyGram’s page must stay in its own tab so quotes can load. Pickup total stays at 0 until
                    you pick an agent.
                </p>
                <ol className="space-y-2 text-sm text-white/70 list-decimal pl-5">
                    <li>
                        {isWithdraw ? 'Cash-out' : 'Cash-in'} country:{' '}
                        <strong className="text-white">United States</strong> (sandbox test agents)
                    </li>
                    <li>
                        Lookup location — search <strong className="text-white">New Brighton</strong> and select
                        an agent (e.g. CUB FOODS)
                    </li>
                    <li>Total pickup amount fills in, then tap Continue</li>
                </ol>
                <a
                    href={url}
                    target="stepay-moneygram"
                    rel="noopener noreferrer"
                    className={dash.ctaFull}
                >
                    <ExternalLink className="h-5 w-5" />
                    Open MoneyGram
                </a>
                <button type="button" onClick={onClose} className={`${dash.ctaGhost} w-full justify-center`}>
                    I&apos;m done — track status here
                </button>
            </div>
        </div>
    );
}
