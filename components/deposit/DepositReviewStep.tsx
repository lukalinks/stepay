'use client';

import { ArrowDownLeft, Loader2, ShieldCheck } from 'lucide-react';
import { dash } from '@/lib/dashboard-ui';
import { MobileOperatorBadge } from '@/components/MobileOperatorPicker';
import type { MobileOperatorId } from '@/lib/markets';

type DepositReviewStepProps = {
    amount: number;
    asset: 'xlm' | 'usdc';
    cryptoAmount: number;
    phoneDisplay: string;
    dialCode: string;
    operator: MobileOperatorId;
    currency: string;
    formatFiat: (amount: number) => string;
    rate: number;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    error?: string;
};

export function DepositReviewStep({
    amount,
    asset,
    cryptoAmount,
    phoneDisplay,
    dialCode,
    operator,
    currency,
    formatFiat,
    rate,
    onConfirm,
    onCancel,
    isLoading,
    error,
}: DepositReviewStepProps) {
    return (
        <div className="space-y-5">
            <div className={`${dash.panelInset} space-y-4 p-4`}>
                <div className="flex items-center gap-2 text-[var(--brand-accent)]">
                    <ShieldCheck className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-bold text-white">Review deposit</p>
                </div>

                <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-white/50">You pay</span>
                        <span className="font-bold text-white tabular-nums">{formatFiat(amount)}</span>
                    </div>
                    <div className="flex items-center justify-center py-1">
                        <ArrowDownLeft className="h-4 w-4 text-[var(--brand-accent)]" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-white/50">You receive</span>
                        <span className="font-bold text-white tabular-nums">
                            {cryptoAmount.toFixed(asset === 'usdc' ? 2 : 4)} {asset.toUpperCase()}
                        </span>
                    </div>
                    <div className={`${dash.divider} pt-3 space-y-2`}>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-white/50">Rate</span>
                            <span className="text-white/75 tabular-nums">
                                1 {asset.toUpperCase()} ≈ {rate.toFixed(2)} {currency}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-white/50">Mobile number</span>
                            <span className="font-medium text-white">
                                {dialCode}
                                {phoneDisplay.replace(/\D/g, '')}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-white/50">Network</span>
                            <MobileOperatorBadge operatorId={operator} />
                        </div>
                    </div>
                </div>
            </div>

            <p className={`${dash.hint} text-center`}>
                A payment prompt will be sent to your phone. Approve it to complete your deposit.
            </p>

            {error && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {error}
                </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={onCancel} disabled={isLoading} className={`${dash.ctaSecondary} flex-1`}>
                    Back
                </button>
                <button type="button" onClick={onConfirm} disabled={isLoading} className={`${dash.ctaFull} flex-1`}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isLoading ? 'Sending request…' : 'Send payment request'}
                </button>
            </div>
        </div>
    );
}
