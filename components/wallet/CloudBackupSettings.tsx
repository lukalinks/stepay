'use client';

import { useState } from 'react';
import { Loader2, Cloud, CloudOff, Mail } from 'lucide-react';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { dash } from '@/lib/dashboard-ui';
import { exportVaultForBackup, hasLocalWallet, isWalletUnlocked } from '@/lib/client-wallet';
import { signBackupUploadProof } from '@/lib/client-backup-proof';
import {
    disableWalletBackup,
    requestWalletBackupDeleteIntent,
    requestWalletBackupUploadIntent,
    uploadWalletBackup,
} from '@/lib/wallet-backup-client';
import { useWallet } from '@/components/wallet/WalletProvider';

type CloudBackupSettingsProps = {
    cloudBackupEnabled: boolean;
    hasCloudBackup: boolean;
    walletCustody?: 'self' | 'hosted';
    onUpdated: () => void;
};

type OtpStep = 'idle' | 'upload-code' | 'delete-code';

export function CloudBackupSettings({
    cloudBackupEnabled,
    hasCloudBackup,
    walletCustody,
    onUpdated,
}: CloudBackupSettingsProps) {
    const { requestUnlock, openRestore } = useWallet();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [otpStep, setOtpStep] = useState<OtpStep>('idle');
    const [confirmCode, setConfirmCode] = useState('');
    const [challengeNonce, setChallengeNonce] = useState('');
    const [maskedEmail, setMaskedEmail] = useState('');

    if (walletCustody === 'hosted') {
        return null;
    }

    const resetOtp = () => {
        setOtpStep('idle');
        setConfirmCode('');
        setChallengeNonce('');
        setMaskedEmail('');
    };

    const startUploadIntent = async () => {
        setError(null);
        setMessage(null);
        if (!hasLocalWallet()) {
            if (hasCloudBackup) {
                openRestore();
                return;
            }
            setError('No wallet on this device. Restore from backup or sign in on the device where you created your account.');
            return;
        }
        if (!isWalletUnlocked()) {
            requestUnlock();
            setMessage('Unlock your wallet first, then try again.');
            return;
        }
        setLoading(true);
        try {
            const intent = await requestWalletBackupUploadIntent();
            if (!intent.ok || !intent.challengeNonce) {
                setError(intent.error || 'Could not send verification code.');
                return;
            }
            setChallengeNonce(intent.challengeNonce);
            setMaskedEmail(intent.maskedEmail || 'your email');
            setOtpStep('upload-code');
            setMessage(
                intent.devConfirmCode
                    ? `Dev code: ${intent.devConfirmCode} — enter the 6-digit code sent to ${intent.maskedEmail || 'your email'}.`
                    : `Enter the 6-digit code sent to ${intent.maskedEmail || 'your email'}.`
            );
        } finally {
            setLoading(false);
        }
    };

    const completeUpload = async () => {
        setError(null);
        setLoading(true);
        try {
            const vault = exportVaultForBackup();
            if (!vault) {
                setError('Could not read wallet from this device.');
                return;
            }
            const keyProof = await signBackupUploadProof(challengeNonce);
            const result = await uploadWalletBackup(vault, {
                confirmCode: confirmCode.replace(/\D/g, ''),
                challengeNonce,
                keyProof,
            });
            if (!result.ok) {
                setError(result.error || 'Could not enable backup.');
                return;
            }
            setMessage('Cloud backup is on. You can restore on a new phone with email, code, and password.');
            resetOtp();
            onUpdated();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not enable backup.');
        } finally {
            setLoading(false);
        }
    };

    const startDeleteIntent = async () => {
        setError(null);
        setMessage(null);
        setLoading(true);
        try {
            const intent = await requestWalletBackupDeleteIntent();
            if (!intent.ok) {
                setError(intent.error || 'Could not send verification code.');
                return;
            }
            setMaskedEmail(intent.maskedEmail || 'your email');
            setOtpStep('delete-code');
            setMessage(
                intent.devConfirmCode
                    ? `Dev code: ${intent.devConfirmCode} — enter the code to confirm turning off backup.`
                    : `Enter the 6-digit code sent to ${intent.maskedEmail || 'your email'} to turn off backup.`
            );
        } finally {
            setLoading(false);
        }
    };

    const completeDelete = async () => {
        setError(null);
        setLoading(true);
        try {
            const result = await disableWalletBackup(confirmCode.replace(/\D/g, ''));
            if (!result.ok) {
                setError(result.error || 'Could not disable backup.');
                return;
            }
            setMessage('Cloud backup turned off. Save your secret key in Settings if you change phones.');
            resetOtp();
            onUpdated();
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardCard
            title="Cloud backup"
            subtitle="Encrypted with your password — recommended so you can use a new phone without your secret key."
        >
            <p className={`text-sm ${dash.hint}`}>
                {cloudBackupEnabled && hasCloudBackup
                    ? 'Backup is active. Only you can decrypt it with your account password.'
                    : cloudBackupEnabled
                      ? 'Backup is enabled but not saved yet — turn it on below from this device.'
                      : 'Device-only mode — maximum privacy, but you need your secret key on a new phone.'}
            </p>

            {message && (
                <p className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                    {message}
                </p>
            )}
            {error && (
                <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
            )}

            {otpStep !== 'idle' && (
                <div className="mt-4 space-y-3">
                    <label htmlFor="backup-otp" className={dash.sectionLabel}>
                        Email verification code {maskedEmail ? `(sent to ${maskedEmail})` : ''}
                    </label>
                    <input
                        id="backup-otp"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={confirmCode}
                        onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full max-w-xs rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-lg tracking-widest text-white/90 outline-none focus:border-[var(--brand-accent)]"
                        placeholder="000000"
                    />
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={loading || confirmCode.length !== 6}
                            onClick={otpStep === 'upload-code' ? completeUpload : completeDelete}
                            className={dash.ctaSecondary}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                            Confirm
                        </button>
                        <button type="button" onClick={resetOtp} disabled={loading} className={dash.ctaSecondary}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {otpStep === 'idle' && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {(!cloudBackupEnabled || !hasCloudBackup) && (
                        <button type="button" onClick={startUploadIntent} disabled={loading} className={dash.ctaSecondary}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
                            Enable cloud backup
                        </button>
                    )}
                    {cloudBackupEnabled && hasCloudBackup && (
                        <button type="button" onClick={startDeleteIntent} disabled={loading} className={dash.ctaSecondary}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudOff className="h-4 w-4" />}
                            Turn off backup
                        </button>
                    )}
                    {hasCloudBackup && !hasLocalWallet() && (
                        <button type="button" onClick={openRestore} className={dash.ctaSecondary}>
                            Restore on this device
                        </button>
                    )}
                </div>
            )}
        </DashboardCard>
    );
}
