'use client';

import { WalletBackupBanner } from '@/components/wallet/WalletBackupBanner';
import { OnboardingChecklist } from '@/components/wallet/OnboardingChecklist';
import { useWallet } from '@/components/wallet/WalletProvider';

export function DashboardWalletExtras({
    profileIncomplete,
    hasCloudBackup,
    hasCompletedDeposit,
}: {
    profileIncomplete: boolean;
    hasCloudBackup?: boolean;
    hasCompletedDeposit?: boolean;
}) {
    const { unlocked, walletCustody } = useWallet();

    return (
        <>
            <OnboardingChecklist
                profileComplete={!profileIncomplete}
                walletUnlocked={unlocked}
                hasCloudBackup={hasCloudBackup}
                hasCompletedDeposit={hasCompletedDeposit}
            />
            <WalletBackupBanner walletCustody={walletCustody} walletUnlocked={unlocked} />
        </>
    );
}
