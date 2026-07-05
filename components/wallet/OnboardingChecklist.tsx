'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { dash } from '@/lib/dashboard-ui';
import { markOnboardingSeen, shouldShowOnboardingChecklist } from '@/lib/client-wallet';
import { useEffect, useState } from 'react';

type ChecklistProps = {
    profileComplete?: boolean;
    walletUnlocked?: boolean;
};

export function OnboardingChecklist({ profileComplete, walletUnlocked }: ChecklistProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(shouldShowOnboardingChecklist());
    }, []);

    if (!visible) return null;

    const steps = [
        { done: true, label: 'Wallet created on this device', href: null },
        { done: walletUnlocked, label: 'Wallet unlocked', href: null },
        {
            done: profileComplete,
            label: 'Complete profile (for deposits & cash out)',
            href: '/profile/complete?next=/dashboard',
        },
        {
            done: false,
            label: 'Back up secret key in Settings',
            href: '/dashboard/settings#wallet-security',
        },
        { done: false, label: 'Make your first deposit', href: '/dashboard/buy' },
    ];

    return (
        <div className={`${dash.panelInset} mb-4 p-4`}>
            <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                    <p className="text-sm font-semibold text-white">Get started with Stepay</p>
                    <p className="mt-0.5 text-xs text-white/45">Your non-custodial wallet is ready. Finish these when you can.</p>
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
