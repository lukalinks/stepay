'use client';

import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { AuthPasswordField } from '@/components/auth/AuthPasswordField';
import { BRAND, authTextFieldSx, primaryCtaSx } from '@/lib/brand';
import { hasLocalWallet, restoreVaultFromBackup } from '@/lib/client-wallet';
import { fetchWalletBackupAfterOtp, requestWalletRestoreCode } from '@/lib/wallet-backup-client';

type RestoreWalletDialogProps = {
    open: boolean;
    onClose: () => void;
    onRestored: () => void;
    serverWalletPublic?: string | null;
    forceOpen?: boolean;
};

export function RestoreWalletDialog({
    open,
    onClose,
    onRestored,
    serverWalletPublic,
    forceOpen = false,
}: RestoreWalletDialogProps) {
    const [step, setStep] = useState<'intro' | 'code' | 'password'>('intro');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [devCode, setDevCode] = useState<string | undefined>();
    const [maskedEmail, setMaskedEmail] = useState<string | undefined>();
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [pendingVault, setPendingVault] = useState<Parameters<typeof restoreVaultFromBackup>[0] | null>(null);

    useEffect(() => {
        if (open) {
            setStep('intro');
            setError(null);
            setOtp('');
            setPassword('');
            setPendingVault(null);
            setDevCode(undefined);
        }
    }, [open]);

    const sendCode = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await requestWalletRestoreCode();
            if (!result.ok) {
                setError(result.error || 'Could not send code.');
                return;
            }
            setDevCode(result.devConfirmCode);
            setMaskedEmail(result.maskedEmail);
            setStep('code');
        } finally {
            setLoading(false);
        }
    };

    const verifyCode = async () => {
        if (otp.replace(/\D/g, '').length !== 6) {
            setError('Enter the 6-digit code from your email.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = await fetchWalletBackupAfterOtp(otp);
            if (!result.ok || !result.vault) {
                setError(result.error || 'Verification failed.');
                return;
            }
            if (
                serverWalletPublic &&
                result.vault.publicKey.trim().toUpperCase() !== serverWalletPublic.trim().toUpperCase()
            ) {
                setError('Backup does not match your account. Contact support.');
                return;
            }
            setPendingVault(result.vault);
            setStep('password');
        } finally {
            setLoading(false);
        }
    };

    const finishRestore = async () => {
        if (!pendingVault) return;
        setLoading(true);
        setError(null);
        try {
            await restoreVaultFromBackup(pendingVault, password);
            onRestored();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not unlock wallet. Check your password.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = forceOpen ? undefined : onClose;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="xs"
            fullWidth
            slotProps={{ paper: { sx: { bgcolor: BRAND.surface, color: '#fff' } } }}
        >
            <DialogTitle sx={{ fontWeight: 700 }}>
                {step === 'intro' ? 'Restore your wallet' : step === 'code' ? 'Verify your email' : 'Unlock wallet'}
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 0.5, pb: 1 }}>
                    {step === 'intro' && (
                        <>
                            <Typography sx={{ fontSize: '0.875rem', color: BRAND.textMuted }}>
                                Your wallet isn&apos;t on this device yet. We&apos;ll send a code to your email, then you
                                enter your account password — no secret key needed.
                            </Typography>
                            {error && <Alert severity="error">{error}</Alert>}
                            <Button variant="contained" onClick={sendCode} disabled={loading} sx={primaryCtaSx}>
                                {loading ? <CircularProgress size={22} sx={{ color: BRAND.accentContrast }} /> : 'Email me a code'}
                            </Button>
                            {!forceOpen && (
                                <Button variant="text" onClick={onClose} sx={{ color: BRAND.textMuted, textTransform: 'none' }}>
                                    Later
                                </Button>
                            )}
                        </>
                    )}

                    {step === 'code' && (
                        <>
                            <Typography sx={{ fontSize: '0.875rem', color: BRAND.textMuted }}>
                                Enter the 6-digit code we sent{maskedEmail ? ` to ${maskedEmail}` : ''}.
                            </Typography>
                            {devCode && (
                                <Alert severity="info" sx={{ bgcolor: 'rgba(201,169,98,0.12)', color: BRAND.accent }}>
                                    Dev code: <strong>{devCode}</strong>
                                </Alert>
                            )}
                            {error && <Alert severity="error">{error}</Alert>}
                            <TextField
                                label="Verification code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                fullWidth
                                inputMode="numeric"
                                autoFocus
                                sx={{
                                    ...authTextFieldSx,
                                    '& input': { textAlign: 'center', letterSpacing: '0.3em', fontWeight: 700 },
                                }}
                            />
                            <Button variant="contained" onClick={verifyCode} disabled={loading} sx={primaryCtaSx}>
                                {loading ? 'Checking…' : 'Continue'}
                            </Button>
                            <Button
                                variant="text"
                                disabled={loading}
                                onClick={sendCode}
                                sx={{ color: BRAND.accent, textTransform: 'none', fontWeight: 600 }}
                            >
                                Resend code
                            </Button>
                        </>
                    )}

                    {step === 'password' && (
                        <>
                            <Typography sx={{ fontSize: '0.875rem', color: BRAND.textMuted }}>
                                Enter the same password you use to sign in. This decrypts your wallet on this device.
                            </Typography>
                            {error && <Alert severity="error">{error}</Alert>}
                            <AuthPasswordField
                                id="restore-wallet-password"
                                label="Account password"
                                value={password}
                                onChange={setPassword}
                                autoComplete="current-password"
                            />
                            <Button
                                variant="contained"
                                onClick={finishRestore}
                                disabled={loading || password.length < 6}
                                sx={primaryCtaSx}
                            >
                                {loading ? 'Restoring…' : 'Restore & unlock'}
                            </Button>
                        </>
                    )}
                </Stack>
            </DialogContent>
        </Dialog>
    );
}

export function shouldOfferCloudRestore(
    walletCustody: 'self' | 'hosted' | null,
    hasCloudBackup: boolean
): boolean {
    return walletCustody === 'self' && hasCloudBackup && !hasLocalWallet();
}
