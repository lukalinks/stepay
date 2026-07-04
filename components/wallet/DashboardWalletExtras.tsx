'use client';

import { WalletBackupBanner } from '@/components/wallet/WalletBackupBanner';
import { OnboardingChecklist } from '@/components/wallet/OnboardingChecklist';
import { useWallet } from '@/components/wallet/WalletProvider';

export function DashboardWalletExtras({ profileIncomplete }: { profileIncomplete: boolean }) {
    const { unlocked, walletCustody } = useWallet();

    return (
        <>
            <OnboardingChecklist profileComplete={!profileIncomplete} walletUnlocked={unlocked} />
            <WalletBackupBanner walletCustody={walletCustody} walletUnlocked={unlocked} />
        </>
    );
}
