'use client';

import { useWallet } from '@/components/wallet/WalletProvider';
import { isWalletUnlocked } from '@/lib/client-wallet';

/** True when self-custody wallet session is active (React state + in-memory session). */
export function useWalletReady(): {
    walletReady: boolean;
    needsUnlock: boolean;
    walletCustody: 'self' | 'hosted' | null;
} {
    const { unlocked, walletCustody } = useWallet();
    const walletReady = unlocked || isWalletUnlocked();
    const needsUnlock = walletCustody === 'self' && !walletReady;
    return { walletReady, needsUnlock, walletCustody };
}
