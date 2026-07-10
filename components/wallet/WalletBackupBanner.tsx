'use client';

import Link from 'next/link';
import { KeyRound, X } from 'lucide-react';
import { dash } from '@/lib/dashboard-ui';
import { dismissBackupReminder, shouldShowBackupReminder } from '@/lib/client-wallet';
import { useEffect, useState } from 'react';

export function WalletBackupBanner({
    walletCustody,
    walletUnlocked,
}: {
    walletCustody?: 'self' | 'hosted' | null;
    walletUnlocked?: boolean;
}) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (walletCustody === 'self' && walletUnlocked && shouldShowBackupReminder()) {
            setVisible(true);
        } else {
            setVisible(false);
        }
    }, [walletCustody, walletUnlocked]);

    if (!visible) return null;

    return (
        <div
            className={`${dash.panelInset} mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}
            role="status"
        >
            <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-accent-subtle)]">
                    <KeyRound className="h-5 w-5 text-[var(--brand-accent)]" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">Back up your secret key</p>
                    <p className="mt-0.5 text-xs text-white/50">
                        When you&apos;re ready, open Settings to view and save your secret key offline.
                    </p>
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <Link href="/dashboard/settings#wallet-security" className={`${dash.ctaSecondary} !py-2 !px-3 text-xs`}>
                    Open Settings
                </Link>
                <button
                    type="button"
                    aria-label="Dismiss backup reminder"
                    onClick={() => {
                        dismissBackupReminder();
                        setVisible(false);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
