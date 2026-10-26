'use client';

import { Check, Loader2, Smartphone, Wallet, AlertCircle } from 'lucide-react';
import type { DepositTrackStep } from '@/lib/deposit-track-ui';

export type { DepositTrackStep };

type DepositStatusTrackerProps = {
    step: DepositTrackStep;
    asset: 'xlm' | 'usdc';
    reference?: string;
    errorMessage?: string;
    /** Tighter layout for embedded/dashboard panels */
    compact?: boolean;
};

type StepDef = {
    key: string;
    icon: typeof Check;
    label: string;
    hint?: string;
    state: 'done' | 'current' | 'upcoming' | 'error';
};

export function DepositStatusTracker({
    step,
    asset,
    reference,
    errorMessage,
    compact = false,
}: DepositStatusTrackerProps) {
    const assetLabel = asset.toUpperCase();

    const steps: StepDef[] = [
        {
            key: 'sent',
            icon: Check,
            label: 'Payment request sent',
            state: 'done',
        },
        {
            key: 'approve',
            icon: Smartphone,
            label: 'Approve on your phone',
            hint:
                step === 'awaiting_approval'
                    ? 'Open the mobile money prompt on your phone and approve. This usually takes under a minute.'
                    : undefined,
            state:
                step === 'failed'
                    ? 'error'
                    : step === 'awaiting_approval'
                      ? 'current'
                      : step === 'crediting' || step === 'waiting_trustline' || step === 'complete'
                        ? 'done'
                        : 'upcoming',
        },
        {
            key: 'wallet',
            icon: Wallet,
            label:
                step === 'waiting_trustline'
                    ? `Unlock wallet to receive ${assetLabel}`
                    : step === 'complete'
                      ? `${assetLabel} added to your wallet`
                      : `${assetLabel} to your wallet`,
            hint:
                step === 'waiting_trustline'
                    ? 'Your payment succeeded. Unlock your Stepay wallet below so we can finish sending USDC.'
                    : step === 'crediting'
                      ? 'Payment approved — sending crypto now. Keep this page open if you can.'
                      : step === 'complete'
                        ? 'Your balance is updated. You are all set.'
                        : undefined,
            state:
                step === 'complete'
                    ? 'done'
                    : step === 'waiting_trustline'
                      ? 'current'
                      : step === 'crediting'
                        ? 'current'
                        : step === 'failed'
                          ? 'error'
                          : 'upcoming',
        },
    ];

    return (
        <div className={compact ? 'space-y-3' : 'space-y-4'}>
            <div className="flex items-center gap-2">
                <h3 className={`font-bold font-heading text-white ${compact ? 'text-base' : 'text-lg'}`}>
                    {step === 'complete' ? 'Deposit complete' : 'Deposit in progress'}
                </h3>
                {step !== 'complete' && step !== 'failed' && (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-accent)]" aria-hidden />
                )}
            </div>

            {step !== 'complete' && step !== 'failed' && (
                <p className="text-xs text-white/45" role="status" aria-live="polite">
                    {step === 'awaiting_approval'
                        ? 'Waiting for approval on your phone…'
                        : step === 'crediting'
                          ? 'Payment approved — crediting your wallet…'
                          : step === 'waiting_trustline'
                            ? 'Payment received — unlock your wallet to finish…'
                            : 'Updating status…'}
                </p>
            )}

            {step === 'complete' && (
                <p className="text-xs text-white/50" role="status" aria-live="polite">
                    {assetLabel} is in your wallet and ready to use.
                </p>
            )}

            <div className={compact ? 'space-y-2' : 'space-y-3'}>
                {steps.map((s) => {
                    const Icon = s.icon;
                    const isDone = s.state === 'done';
                    const isCurrent = s.state === 'current';
                    const isError = s.state === 'error';

                    return (
                        <div
                            key={s.key}
                            className={`flex items-start gap-3 rounded-xl border transition-colors ${
                                compact ? 'p-2.5' : 'p-3'
                            } ${
                                isDone
                                    ? 'border-[var(--brand-accent)]/25 bg-[var(--brand-accent)]/10'
                                    : isCurrent
                                      ? 'border-[var(--brand-accent)]/30 bg-[var(--brand-accent)]/[0.06]'
                                      : isError
                                        ? 'border-red-500/25 bg-red-500/10'
                                        : 'border-white/[0.08] bg-white/[0.03]'
                            }`}
                        >
                            <div
                                className={`flex shrink-0 items-center justify-center rounded-full ${
                                    compact ? 'h-8 w-8' : 'h-9 w-9'
                                } ${
                                    isDone
                                        ? 'bg-[var(--brand-accent)] text-[var(--brand-accent-contrast)]'
                                        : isCurrent
                                          ? 'bg-[var(--brand-accent)]/20 text-[var(--brand-accent)] ring-2 ring-[var(--brand-accent)]/40'
                                          : isError
                                            ? 'bg-red-500/20 text-red-400'
                                            : 'bg-white/10 text-white/35'
                                }`}
                            >
                                {isDone ? (
                                    <Check className="h-5 w-5" />
                                ) : isCurrent ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isError ? (
                                    <AlertCircle className="h-4 w-4" />
                                ) : (
                                    <Icon className="h-4 w-4" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p
                                    className={`text-sm font-medium ${
                                        isDone
                                            ? 'text-[var(--brand-accent)]'
                                            : isCurrent
                                              ? 'text-white'
                                              : isError
                                                ? 'text-red-300'
                                                : 'text-white/45'
                                    }`}
                                >
                                    {s.label}
                                </p>
                                {s.hint && (isCurrent || (isDone && step === 'complete' && s.key === 'wallet')) && (
                                    <p className={`mt-1 text-xs ${isDone ? 'text-white/45' : 'text-white/55'}`}>
                                        {s.hint}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {step === 'failed' && errorMessage && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {errorMessage}
                </p>
            )}

            {reference && step !== 'complete' && (
                <p className="font-mono text-[0.6875rem] text-white/30">Ref {reference}</p>
            )}
        </div>
    );
}
