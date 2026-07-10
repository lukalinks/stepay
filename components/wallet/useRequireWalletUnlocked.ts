'use client';

import { useWallet } from '@/components/wallet/WalletProvider';

/** Returns false when self-custody wallet must be unlocked first. */
export function useRequireWalletUnlocked(): {
    canProceed: () => boolean;
    needsUnlock: boolean;
} {
    const { unlocked, walletCustody, requestUnlock } = useWallet();
    const needsUnlock = walletCustody === 'self' && !unlocked;

    const canProceed = () => {
        if (!needsUnlock) return true;
        requestUnlock();
        return false;
    };

    return { canProceed, needsUnlock };
}
