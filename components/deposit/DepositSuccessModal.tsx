'use client';

import { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { dash } from '@/lib/dashboard-ui';
import { MobileOperatorBadge } from '@/components/MobileOperatorPicker';
import type { MobileOperatorId } from '@/lib/markets';

type DepositSuccessModalProps = {
    isOpen: boolean;
    onClose: () => void;
    amount: number;
    asset: 'xlm' | 'usdc';
    cryptoAmount: number;
    formatFiat: (amount: number) => string;
    dialCode: string;
    phoneDisplay: string;
    operator: MobileOperatorId;
};

export function DepositSuccessModal({
    isOpen,
    onClose,
    amount,
    asset,
    cryptoAmount,
    formatFiat,
    dialCode,
    phoneDisplay,
    operator,
}: DepositSuccessModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            aria-modal="true"
            role="dialog"
            aria-labelledby="deposit-success-title"
        >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-hidden />
            <div className={`relative w-full max-w-sm ${dash.panel} p-6 text-center animate-in fade-in zoom-in-95 duration-200`}>
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-3 top-3 rounded-xl p-2 text-white/50 hover:bg-white/[0.08] hover:text-white"
                    aria-label="Close"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className={dash.successIcon}>
                    <CheckCircle className="h-8 w-8" />
                </div>
                <h2 id="deposit-success-title" className="mb-2 text-xl font-bold text-white font-heading">
                    Deposit successful!
                </h2>
                <p className="mb-1 text-2xl font-bold text-[var(--brand-accent)] tabular-nums">
                    {cryptoAmount.toFixed(asset === 'usdc' ? 2 : 4)} {asset.toUpperCase()}
                </p>
                <p className="mb-4 text-sm text-white/55">Added to your wallet</p>

                <div className={`${dash.panelInset} mb-5 space-y-2 p-3 text-left text-sm`}>
                    <div className="flex justify-between gap-2">
                        <span className="text-white/45">Paid</span>
                        <span className="font-medium text-white">{formatFiat(amount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-white/45">From</span>
                        <span className="flex items-center gap-2 font-medium text-white">
                            {dialCode}
                            {phoneDisplay.replace(/\D/g, '')}
                            <MobileOperatorBadge operatorId={operator} />
                        </span>
                    </div>
                </div>

                <button type="button" onClick={onClose} className={dash.ctaFull}>
                    Done
                </button>
            </div>
        </div>
    );
}
