'use client';

import { Lock } from 'lucide-react';
import { dash } from '@/lib/dashboard-ui';
import { useWallet } from '@/components/wallet/WalletProvider';

/** Inline prompt when self-custody wallet must be unlocked before a transaction. */
export function WalletGateInline({
    message = "Unlock your wallet before continuing. You'll confirm with an email code next.",
    ctaLabel = 'Unlock wallet',
}: {
    message?: string;
    ctaLabel?: string;
} = {}) {
    const { requestUnlock } = useWallet();

    return (
        <div className={`${dash.formWarning} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
            <div className="flex gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
                <p className="text-sm">{message}</p>
            </div>
            <button type="button" onClick={requestUnlock} className={`${dash.ctaSecondary} shrink-0 !py-2 !px-3 text-xs`}>
                {ctaLabel}
            </button>
        </div>
    );
}
