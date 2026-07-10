'use client';

import { Check, Loader2, Smartphone, Wallet, AlertCircle } from 'lucide-react';

export type DepositTrackStep = 'awaiting_approval' | 'waiting_trustline' | 'complete' | 'failed';

type DepositStatusTrackerProps = {
    step: DepositTrackStep;
    asset: 'xlm' | 'usdc';
    reference?: string;
    errorMessage?: string;
};

type StepDef = {
    key: string;
    icon: typeof Check;
    label: string;
    hint?: string;
    state: 'done' | 'current' | 'upcoming' | 'error';
};

export function DepositStatusTracker({ step, asset, reference, errorMessage }: DepositStatusTrackerProps) {
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
            label: 'Approve payment on your phone',
            hint:
                step === 'awaiting_approval'
                    ? 'Check your phone for a mobile money prompt and approve the payment.'
                    : undefined,
            state:
                step === 'failed'
                    ? 'error'
                    : step === 'awaiting_approval'
                      ? 'current'
                      : step === 'waiting_trustline' || step === 'complete'
                        ? 'done'
                        : 'upcoming',
        },
        {
            key: 'wallet',
            icon: Wallet,
            label: `${assetLabel} sent to your wallet`,
            hint:
                step === 'waiting_trustline'
                    ? 'Unlock your wallet in Stepay to receive USDC on your account.'
                    : step === 'complete'
                      ? 'Your balance has been updated.'
                      : undefined,
            state:
                step === 'complete'
                    ? 'done'
                    : step === 'waiting_trustline'
                      ? 'current'
                      : step === 'failed'
                        ? 'error'
                        : 'upcoming',
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold font-heading text-white">Deposit status</h3>
                {step !== 'complete' && step !== 'failed' && (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-accent)]" aria-hidden />
                )}
            </div>

            {step !== 'complete' && step !== 'failed' && (
                <p className="text-xs text-white/45" role="status" aria-live="polite">
                    {step === 'awaiting_approval'
                        ? 'Waiting for you to approve the payment on your phone…'
                        : step === 'waiting_trustline'
                          ? 'Payment received — finish wallet setup to credit USDC…'
                          : 'Updating status…'}
                </p>
            )}

            <div className="space-y-3">
                {steps.map((s) => {
                    const Icon = s.icon;
                    const isDone = s.state === 'done';
                    const isCurrent = s.state === 'current';
                    const isError = s.state === 'error';

                    return (
                        <div
                            key={s.key}
                            className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
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
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
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
                                {s.hint && (isCurrent || isDone) && (
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

            {reference && (
                <p className="font-mono text-xs text-white/30">Ref: {reference}</p>
            )}
        </div>
    );
}
