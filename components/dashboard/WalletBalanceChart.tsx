'use client';

import { BRAND } from '@/lib/brand';

const ACCENT = BRAND.accent;

export function WalletBalanceChart() {
    return (
        <div className="relative mt-4 h-[56px]">
            <svg viewBox="0 0 280 56" width="100%" height="56" preserveAspectRatio="none" aria-hidden>
                <defs>
                    <linearGradient id="walletChartFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ACCENT} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path
                    d="M0 44 L40 40 L80 36 L120 32 L160 28 L200 22 L240 16 L280 12 L280 56 L0 56 Z"
                    fill="url(#walletChartFill)"
                />
                <path
                    d="M0 44 L40 40 L80 36 L120 32 L160 28 L200 22 L240 16 L280 12"
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <circle cx="280" cy="12" r="4" fill={ACCENT} />
                <circle cx="280" cy="12" r="9" fill={ACCENT} fillOpacity="0.2" />
            </svg>
        </div>
    );
}
