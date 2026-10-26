'use client';

import { useWallet } from '@/components/wallet/WalletProvider';
import { isWalletUnlocked } from '@/lib/client-wallet';

/** Returns false when self-custody wallet must be unlocked first. */
export function useRequireWalletUnlocked(): {
    canProceed: () => boolean;
    needsUnlock: boolean;
    walletReady: boolean;
} {
    const { unlocked, walletCustody, requestUnlock } = useWallet();
    const walletReady = unlocked || isWalletUnlocked();
    const needsUnlock = walletCustody === 'self' && !walletReady;

    const canProceed = () => {
        if (walletCustody !== 'self') return true;
        if (walletReady) return true;
        requestUnlock();
        return false;
    };

    return { canProceed, needsUnlock, walletReady };
}
