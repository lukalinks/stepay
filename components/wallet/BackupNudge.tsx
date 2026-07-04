'use client';

import Link from 'next/link';
import { shouldShowSoftBackupNudge } from '@/lib/client-wallet';
import { dash } from '@/lib/dashboard-ui';
import { useEffect, useState } from 'react';

export function BackupNudge() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(shouldShowSoftBackupNudge());
    }, []);

    if (!visible) return null;

    return (
        <p className={`${dash.formWarning} text-xs`}>
            Consider backing up your secret key in{' '}
            <Link href="/dashboard/profile#wallet-security" className="font-semibold underline">
                Profile → Wallet
            </Link>{' '}
            before moving money.
        </p>
    );
}
