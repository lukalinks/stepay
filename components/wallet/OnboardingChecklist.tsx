'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { dash } from '@/lib/dashboard-ui';
import {
    hasRevealedSecret,
    markOnboardingSeen,
    shouldShowOnboardingChecklist,
} from '@/lib/client-wallet';
import { useEffect, useState } from 'react';

type ChecklistProps = {
    profileComplete?: boolean;
    walletUnlocked?: boolean;
    hasCloudBackup?: boolean;
    hasCompletedDeposit?: boolean;
};

export function OnboardingChecklist({
    profileComplete,
    walletUnlocked,
    hasCloudBackup,
    hasCompletedDeposit,
}: ChecklistProps) {
    const [visible, setVisible] = useState(false);
    const [secretBackedUp, setSecretBackedUp] = useState(false);

    useEffect(() => {
        setVisible(shouldShowOnboardingChecklist());
        setSecretBackedUp(hasRevealedSecret() || Boolean(hasCloudBackup));
    }, [hasCloudBackup]);

    if (!visible) return null;

    const steps = [
        { done: true, label: 'Wallet created on this device', href: null as string | null },
        { done: Boolean(walletUnlocked), label: 'Wallet unlocked', href: null },
        {
            done: Boolean(profileComplete),
            label: 'Complete profile (needed for cash out)',
            href: '/profile/complete?next=/dashboard',
        },
        {
            done: secretBackedUp,
            label: hasCloudBackup ? 'Cloud backup enabled' : 'Back up secret key in Settings',
            href: '/dashboard/settings#wallet-security',
        },
        {
            done: Boolean(hasCompletedDeposit),
            label: 'Make your first deposit',
            href: '/dashboard/buy',
        },
    ];

    const allDone = steps.every((s) => s.done);

    return (
        <div className={`${dash.panelInset} mb-4 p-4`}>
            <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                    <p className="text-sm font-semibold text-white">Get started with Stepay</p>
                    <p className="mt-0.5 text-xs text-white/45">
                        {allDone
                            ? "You're set — dismiss anytime."
                            : 'Your non-custodial wallet is ready. Finish these when you can.'}
                    </p>
                </div>
                <button
                    type="button"
                    aria-label="Dismiss checklist"
                    onClick={() => {
                        markOnboardingSeen();
                        setVisible(false);
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/40 hover:bg-white/[0.06] hover:text-white/70"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <ul className="space-y-2">
                {steps.map((step) => (
                    <li key={step.label} className="flex items-start gap-2 text-sm">
                        {step.done ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
                        ) : (
                            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-white/25" />
                        )}
                        {step.href && !step.done ? (
                            <Link href={step.href} className={`${dash.accentLink} text-white/80 hover:text-white`}>
                                {step.label}
                            </Link>
                        ) : (
                            <span className={step.done ? 'text-white/50' : 'text-white/75'}>{step.label}</span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
