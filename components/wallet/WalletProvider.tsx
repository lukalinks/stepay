'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import {
    clearWalletSession,
    consumeWalletUnlockHint,
    createLocalWallet,
    getLocalWalletPublicKey,
    getUnlockedSecret,
    hasLocalWallet,
    importLocalWallet,
    isSecureWalletContext,
    isValidStellarSecretKey,
    isWalletUnlocked,
    touchWalletSession,
    unlockLocalWallet,
} from '@/lib/client-wallet';
import { isClientSigning } from '@/lib/client-signing-lock';
import { clientEnsureUSDCTrustline, clientEnsureUSDT0Trustline } from '@/lib/client-stellar';
import { AuthPasswordField } from '@/components/auth/AuthPasswordField';
import { BRAND, authTextFieldSx, primaryCtaSx } from '@/lib/brand';
import { RestoreWalletDialog, shouldOfferCloudRestore } from '@/components/wallet/RestoreWalletDialog';

type WalletContextValue = {
    unlocked: boolean;
    localPublicKey: string | null;
    walletCustody: 'self' | 'hosted' | null;
    hasCloudBackup: boolean;
    lock: () => void;
    requestUnlock: () => void;
    openRestore: () => void;
    ensureUsdcReady: () => Promise<boolean>;
    refreshLocalWallet: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet() {
    const ctx = useContext(WalletContext);
    if (!ctx) throw new Error('useWallet must be used within WalletProvider');
    return ctx;
}

function WalletUnlockDialog({
    open,
    serverWalletPublic,
    hasCloudBackup,
    onClose,
    onUnlocked,
    onUseCloudRestore,
}: {
    open: boolean;
    serverWalletPublic?: string | null;
    hasCloudBackup: boolean;
    onClose: () => void;
    onUnlocked: () => void;
    onUseCloudRestore: () => void;
}) {
    const [password, setPassword] = useState('');
    const [importSecret, setImportSecret] = useState('');
    const [mode, setMode] = useState<'unlock' | 'import'>(hasLocalWallet() ? 'unlock' : 'import');
    const [error, setError] = useState<string | null>(null);
    const [hint, setHint] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const secureContext = isSecureWalletContext();

    useEffect(() => {
        if (open) {
            setMode(hasLocalWallet() ? 'unlock' : 'import');
            setHint(consumeWalletUnlockHint());
            setError(null);
            setPassword('');
            setImportSecret('');
        }
    }, [open]);

    const validateAgainstServer = (publicKey: string) => {
        if (!serverWalletPublic) return;
        if (publicKey !== serverWalletPublic.trim()) {
            throw new Error(
                'This secret key does not match your Stepay account. Import the key you saved from Settings.'
            );
        }
    };

    const handleUnlock = async () => {
        setError(null);
        setLoading(true);
        try {
            let publicKey: string;
            if (mode === 'import') {
                if (!isValidStellarSecretKey(importSecret)) {
                    setError('Enter a valid Stellar secret key (starts with S).');
                    return;
                }
                ({ publicKey } = await importLocalWallet(importSecret, password));
            } else {
                ({ publicKey } = await unlockLocalWallet(password));
            }
            validateAgainstServer(publicKey);
            onUnlocked();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not unlock wallet.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            slotProps={{ paper: { sx: { bgcolor: BRAND.surface, color: '#fff' } } }}
        >
            <DialogTitle sx={{ fontWeight: 700 }}>Unlock your wallet</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 0.5 }}>
                    <Typography sx={{ fontSize: '0.875rem', color: BRAND.textMuted }}>
                        {mode === 'import'
                            ? hasCloudBackup
                                ? 'Import your secret key, or use cloud restore (email code + password) instead.'
                                : 'Import the secret key you saved in Settings, or enable cloud backup for easier device changes.'
                            : 'Enter your account password to sign transactions.'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: BRAND.textSubtle }}>
                        Wallet stays unlocked on this device for 24 hours.
                    </Typography>
                    {hint && (
                        <Alert severity="info" sx={{ bgcolor: 'rgba(201,169,98,0.12)', color: BRAND.accent }}>
                            {hint}
                        </Alert>
                    )}
                    {!secureContext && (
                        <Alert severity="warning">
                            Wallet unlock requires a secure connection. Use{' '}
                            <strong>https://stepay.pro</strong> — HTTP cannot access browser encryption.
                        </Alert>
                    )}
                    {error && <Alert severity="error">{error}</Alert>}
                    {mode === 'import' && (
                        <TextField
                            label="Stellar secret key"
                            value={importSecret}
                            onChange={(e) => setImportSecret(e.target.value)}
                            fullWidth
                            multiline
                            minRows={2}
                            sx={authTextFieldSx}
                        />
                    )}
                    <AuthPasswordField
                        id="wallet-unlock-password"
                        label="Account password"
                        value={password}
                        onChange={setPassword}
                        autoComplete="current-password"
                    />
                    <Button variant="contained" onClick={handleUnlock} disabled={loading || password.length < 6 || !secureContext} sx={primaryCtaSx}>
                        {loading ? 'Unlocking…' : mode === 'import' ? 'Import & unlock' : 'Unlock wallet'}
                    </Button>
                    {mode === 'import' && hasCloudBackup && (
                        <Button
                            variant="text"
                            onClick={() => {
                                onClose();
                                onUseCloudRestore();
                            }}
                            sx={{ color: BRAND.accent, textTransform: 'none', fontWeight: 600 }}
                        >
                            Restore with email code instead
                        </Button>
                    )}
                    {hasLocalWallet() && (
                        <Button
                            variant="text"
                            onClick={() => setMode(mode === 'unlock' ? 'import' : 'unlock')}
                            sx={{ color: BRAND.textMuted, textTransform: 'none' }}
                        >
                            {mode === 'unlock' ? 'Import secret key from another device' : 'Back to unlock'}
                        </Button>
                    )}
                </Stack>
            </DialogContent>
        </Dialog>
    );
}

export function WalletProvider({
    children,
    walletCustody,
    serverWalletPublic,
    hasCloudBackup = false,
}: {
    children: React.ReactNode;
    walletCustody: 'self' | 'hosted' | null;
    serverWalletPublic?: string | null;
    hasCloudBackup?: boolean;
}) {
    const [unlocked, setUnlocked] = useState(() =>
        typeof window !== 'undefined' ? isWalletUnlocked() : false
    );
    const [showUnlock, setShowUnlock] = useState(false);
    const [showRestore, setShowRestore] = useState(false);
    const [localPublicKey, setLocalPublicKey] = useState<string | null>(() =>
        typeof window !== 'undefined' ? getLocalWalletPublicKey() : null
    );

    const refreshLocalWallet = useCallback(() => {
        setLocalPublicKey(getLocalWalletPublicKey());
        setUnlocked(isWalletUnlocked());
    }, []);

    useEffect(() => {
        refreshLocalWallet();
        const onFocus = () => refreshLocalWallet();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [refreshLocalWallet]);

    useEffect(() => {
        if (shouldOfferCloudRestore(walletCustody, hasCloudBackup)) {
            setShowRestore(true);
        }
    }, [walletCustody, hasCloudBackup]);

    useEffect(() => {
        const onActivity = () => touchWalletSession();
        window.addEventListener('click', onActivity, { passive: true });
        window.addEventListener('keydown', onActivity, { passive: true });
        return () => {
            window.removeEventListener('click', onActivity);
            window.removeEventListener('keydown', onActivity);
        };
    }, []);

    const openRestore = useCallback(() => {
        setShowRestore(true);
    }, []);

    const requestUnlock = useCallback(() => {
        if (shouldOfferCloudRestore(walletCustody, hasCloudBackup)) {
            setShowRestore(true);
            return;
        }
        setShowUnlock(true);
    }, [walletCustody, hasCloudBackup]);

    const lock = useCallback(() => {
        clearWalletSession();
        setUnlocked(false);
    }, []);

    const ensureUsdcReady = useCallback(async (): Promise<boolean> => {
        if (!isWalletUnlocked() || isClientSigning()) return false;
        try {
            const statusRes = await fetch('/api/deposit/usdc-ready', { credentials: 'include' });
            const status = (await statusRes.json().catch(() => ({}))) as {
                ready?: boolean;
                hasAccount?: boolean;
                activationRequired?: boolean;
                needsUnlock?: boolean;
            };
            if (statusRes.ok && status.ready) {
                await fetch('/api/deposit/retry-pending', { method: 'POST', credentials: 'include' });
                return true;
            }
            // Unfunded / activation unpaid — trustline tx cannot succeed yet.
            if (!status.hasAccount || status.activationRequired) {
                return false;
            }

            await fetch('/api/deposit/usdc-ready', { method: 'POST', credentials: 'include' });
            const secret = getUnlockedSecret();
            await clientEnsureUSDCTrustline(secret);
            await fetch('/api/deposit/retry-pending', { method: 'POST', credentials: 'include' });
            const check = await fetch('/api/deposit/usdc-ready', { credentials: 'include' });
            const data = (await check.json().catch(() => ({}))) as { ready?: boolean };
            return check.ok && Boolean(data.ready);
        } catch (err) {
            console.warn('[usdc-prep]', err);
            return false;
        }
    }, []);

    useEffect(() => {
        if (!unlocked) return;
        const timer = window.setTimeout(() => {
            if (!isClientSigning()) {
                ensureUsdcReady()
                    .catch(() => {})
                    .finally(() => {
                        try {
                            clientEnsureUSDT0Trustline(getUnlockedSecret()).catch(() => {});
                        } catch {
                            /* wallet locked again */
                        }
                    });
            }
        }, 1500);
        return () => window.clearTimeout(timer);
    }, [ensureUsdcReady, unlocked]);

    const value = useMemo(
        () => ({
            unlocked,
            localPublicKey,
            walletCustody,
            hasCloudBackup,
            lock,
            requestUnlock,
            openRestore,
            ensureUsdcReady,
            refreshLocalWallet,
        }),
        [unlocked, localPublicKey, walletCustody, hasCloudBackup, lock, requestUnlock, openRestore, ensureUsdcReady, refreshLocalWallet]
    );

    return (
        <WalletContext.Provider value={value}>
            {children}
            <RestoreWalletDialog
                open={showRestore && walletCustody === 'self' && hasCloudBackup}
                serverWalletPublic={serverWalletPublic}
                onClose={() => setShowRestore(false)}
                onRestored={refreshLocalWallet}
            />
            <WalletUnlockDialog
                open={showUnlock && walletCustody === 'self'}
                hasCloudBackup={hasCloudBackup}
                serverWalletPublic={serverWalletPublic}
                onClose={() => setShowUnlock(false)}
                onUseCloudRestore={() => setShowRestore(true)}
                onUnlocked={() => {
                    refreshLocalWallet();
                    setShowUnlock(false);
                }}
            />
        </WalletContext.Provider>
    );
}

export { createLocalWallet, hasLocalWallet, isValidStellarSecretKey, unlockLocalWallet };
