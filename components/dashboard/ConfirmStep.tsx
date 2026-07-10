'use client';

import { Loader2, ShieldCheck } from 'lucide-react';
import { dash } from '@/lib/dashboard-ui';

type ConfirmStepProps = {
    title: string;
    summary: React.ReactNode;
    confirmCode: string;
    onConfirmCodeChange: (code: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    error?: string;
    errorVariant?: 'error' | 'warning';
    devHint?: string;
    deliveryHint?: string;
    showConfirmSteps?: boolean;
};

export function ConfirmStep({
    title,
    summary,
    confirmCode,
    onConfirmCodeChange,
    onConfirm,
    onCancel,
    isLoading,
    error,
    errorVariant = 'error',
    devHint,
    deliveryHint,
    showConfirmSteps = true,
}: ConfirmStepProps) {
    return (
        <div className="space-y-5">
            <div className={`${dash.panelInset} space-y-3 p-4`}>
                <div className="flex items-center gap-2 text-[var(--brand-accent)]">
                    <ShieldCheck className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-bold text-white">{title}</p>
                </div>
                <div className="text-sm text-white/60">{summary}</div>
            </div>

            {devHint && (
                <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
                    Dev: confirmation code is <span className="font-mono font-bold">{devHint}</span>
                </p>
            )}

            {error && (
                <p
                    className={
                        errorVariant === 'warning'
                            ? `rounded-xl border border-[var(--brand-accent-border)] bg-[var(--brand-accent-subtle)] px-3 py-2 text-sm text-[var(--brand-accent)]`
                            : 'rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300'
                    }
                >
                    {error}
                </p>
            )}

            <div className="space-y-2">
                <label className={dash.label} htmlFor="confirm-code">
                    6-digit confirmation code
                </label>
                <input
                    id="confirm-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={confirmCode}
                    onChange={(e) => onConfirmCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={`${dash.input} text-center text-lg font-bold tracking-[0.3em] tabular-nums`}
                    placeholder="••••••"
                />
                <p className={dash.hint}>
                    {deliveryHint || 'Enter the 6-digit code sent to your email.'}
                </p>
                {showConfirmSteps && (
                    <p className="text-xs text-white/35">Step 1: email code · Step 2: sign on this device</p>
                )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={onCancel} disabled={isLoading} className={`${dash.ctaSecondary} flex-1`}>
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isLoading || confirmCode.length !== 6}
                    className={`${dash.ctaFull} flex-1`}
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isLoading ? 'Confirming…' : 'Confirm'}
                </button>
            </div>
        </div>
    );
}
