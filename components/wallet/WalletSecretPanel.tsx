'use client';

import { useEffect, useState } from 'react';
import { Loader2, KeyRound, ShieldAlert, Copy, Check, LogOut } from 'lucide-react';
import { Message } from '@/components/Message';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { dash } from '@/lib/dashboard-ui';
import {
    getLocalWalletPublicKey,
    hasLocalWallet,
    importLocalWallet,
    isValidStellarSecretKey,
    markSecretRevealed,
    revealLocalWalletSecret,
} from '@/lib/client-wallet';
import { AuthPasswordField } from '@/components/auth/AuthPasswordField';
import { exportHostedWallet, requestWalletExportIntent } from '@/lib/wallet-backup-client';

interface WalletSecretPanelProps {
    walletPublic?: string;
    walletCustody?: 'self' | 'hosted';
    accountEmail?: string;
}

export function WalletSecretPanel({ walletPublic: serverWalletPublic, walletCustody, accountEmail }: WalletSecretPanelProps) {
    const [exportPassword, setExportPassword] = useState('');
    const [importSecret, setImportSecret] = useState('');
    const [exportLoading, setExportLoading] = useState(false);
    const [exportError, setExportError] = useState('');
    const [exported, setExported] = useState<{ publicKey: string; secretKey: string } | null>(null);
    const [copiedField, setCopiedField] = useState<'public' | 'secret' | null>(null);
    const [acknowledgeRisk, setAcknowledgeRisk] = useState(false);
    const [exportOtpStep, setExportOtpStep] = useState(false);
    const [exportConfirmCode, setExportConfirmCode] = useState('');
    const [exportMaskedEmail, setExportMaskedEmail] = useState('');
    const [localPublic, setLocalPublic] = useState<string | null>(null);

    const isSelfCustody = walletCustody !== 'hosted';
    const serverPublic = serverWalletPublic?.trim() || '';
    const localWalletPresent = hasLocalWallet();
    const localKey = localPublic || getLocalWalletPublicKey() || '';
    const walletMismatch =
        isSelfCustody &&
        localWalletPresent &&
        serverPublic.length > 0 &&
        localKey.length > 0 &&
        localKey.toUpperCase() !== serverPublic.toUpperCase();
    const needsImport = isSelfCustody && !localWalletPresent && serverPublic.length > 0;
    const displayPublic = (localKey || serverPublic).trim();

    useEffect(() => {
        setLocalPublic(getLocalWalletPublicKey());
    }, []);

    useEffect(() => {
        if (!exported) return;
        const timer = window.setTimeout(() => setExported(null), 60_000);
        return () => window.clearTimeout(timer);
    }, [exported]);

    const copyText = async (text: string, field: 'public' | 'secret') => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            window.setTimeout(() => setCopiedField(null), 2000);
        } catch {
            // ignore
        }
    };

    const handleSignOut = async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        window.location.href = '/login?next=/dashboard/settings';
    };

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!acknowledgeRisk) {
            setExportError('Please confirm you understand the risk before importing your secret key.');
            return;
        }
        const secret = importSecret.trim();
        if (!isValidStellarSecretKey(secret)) {
            setExportError('Enter a valid Stellar secret key (starts with S).');
            return;
        }
        setExportLoading(true);
        setExportError('');
        try {
            const { publicKey } = await importLocalWallet(secret, exportPassword);
            if (serverPublic && publicKey.toUpperCase() !== serverPublic.toUpperCase()) {
                setExportError(
                    'This secret key does not match your Stepay account. Use the key you saved when you signed up, or sign out and sign in with the correct account.'
                );
                return;
            }
            setLocalPublic(publicKey);
            setImportSecret('');
            setExportPassword('');
            setAcknowledgeRisk(false);
        } catch (err) {
            setExportError(err instanceof Error ? err.message : 'Could not import secret key.');
        } finally {
            setExportLoading(false);
        }
    };

    const handleRevealSecret = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!acknowledgeRisk) {
            setExportError('Please confirm you understand the risk before viewing your secret key.');
            return;
        }
        setExportLoading(true);
        setExportError('');
        setExported(null);
        try {
            if (isSelfCustody) {
                if (!localWalletPresent) {
                    setExportError('No wallet on this device. Import your secret key below or sign out and sign in again on this device.');
                    return;
                }
                const keys = await revealLocalWalletSecret(exportPassword);
                if (serverPublic && keys.publicKey.toUpperCase() !== serverPublic.toUpperCase()) {
                    setExportError(
                        'The wallet on this device does not match your account. Sign out, then sign in with the correct account or import the right secret key.'
                    );
                    return;
                }
                setExported(keys);
                markSecretRevealed();
                setExportPassword('');
                setAcknowledgeRisk(false);
                return;
            }

            if (!exportOtpStep) {
                const intent = await requestWalletExportIntent();
                if (!intent.ok) {
                    setExportError(intent.error || 'Could not send verification code.');
                    return;
                }
                setExportOtpStep(true);
                setExportMaskedEmail(intent.maskedEmail || 'your email');
                if (intent.devConfirmCode) {
                    setExportError(`Dev code: ${intent.devConfirmCode}`);
                }
                return;
            }

            if (exportConfirmCode.replace(/\D/g, '').length !== 6) {
                setExportError('Enter the 6-digit code from your email.');
                return;
            }

            const result = await exportHostedWallet(exportPassword, exportConfirmCode.replace(/\D/g, ''));
            if (!result.ok || !result.publicKey || !result.secretKey) {
                setExportError(result.error || 'Could not show secret key.');
                return;
            }
            setExported({ publicKey: result.publicKey, secretKey: result.secretKey });
            markSecretRevealed();
            setExportPassword('');
            setExportConfirmCode('');
            setExportOtpStep(false);
            setAcknowledgeRisk(false);
        } catch (err) {
            setExportError(err instanceof Error ? err.message : 'Could not show secret key.');
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <div id="wallet-security">
            <DashboardCard
                title="Wallet secret"
                subtitle={
                    isSelfCustody
                        ? 'Non-custodial — your secret key stays on this device until you choose to view it.'
                        : 'Export your secret key to move to another wallet app.'
                }
            >
                <Message variant="info" title="Keep your secret safe" dark>
                    {isSelfCustody
                        ? 'Only reveal your secret key when you need to back up or import into another app. Never share it with anyone.'
                        : 'Anyone with your secret key controls your funds. Export only to move to a self-custody wallet.'}
                </Message>

                {(walletMismatch || needsImport) && (
                    <div className="mt-4 space-y-3">
                        <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                            {walletMismatch
                                ? 'The wallet saved on this device belongs to a different account than the one you are signed into.'
                                : needsImport
                                  ? accountEmail
                                      ? `Signed in as ${accountEmail}, but this device has no wallet keys yet. Import your secret key, or sign out and sign in again with the password you used when you created this account on this phone.`
                                      : 'This device has no wallet keys for your account. Import your secret key, or sign out and sign in again on this device.'
                                  : null}
                        </p>
                        <button type="button" onClick={handleSignOut} className={`${dash.ctaSecondary} inline-flex items-center gap-2`}>
                            <LogOut className="h-4 w-4" />
                            Sign out and switch account
                        </button>
                    </div>
                )}

                {displayPublic && (
                    <div className={`${dash.panelInset} mt-4 p-4`}>
                        <p className={dash.sectionLabel}>
                            {localWalletPresent ? 'Public address' : 'Account address (server)'}
                        </p>
                        <code className="mt-1 block break-all font-mono text-xs text-white/75">{displayPublic}</code>
                    </div>
                )}

                {needsImport ? (
                    <form onSubmit={handleImport} className="mt-4 space-y-4">
                        {exportError && (
                            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{exportError}</p>
                        )}
                        <label className="flex cursor-pointer items-start gap-2 text-sm text-white/65">
                            <input
                                type="checkbox"
                                checked={acknowledgeRisk}
                                onChange={(e) => setAcknowledgeRisk(e.target.checked)}
                                className="mt-1"
                            />
                            <span>I understand anyone with my secret key can take my funds.</span>
                        </label>
                        <AuthPasswordField
                            id="import-password"
                            label="Password to encrypt wallet on this device"
                            value={exportPassword}
                            onChange={setExportPassword}
                            autoComplete="new-password"
                        />
                        <div>
                            <label htmlFor="import-secret" className={dash.sectionLabel}>
                                Secret key
                            </label>
                            <textarea
                                id="import-secret"
                                value={importSecret}
                                onChange={(e) => setImportSecret(e.target.value)}
                                placeholder="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                                rows={3}
                                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white/80 outline-none focus:border-[var(--brand-accent)]"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={exportLoading || !exportPassword || !importSecret.trim() || !acknowledgeRisk}
                            className={dash.ctaSecondary}
                        >
                            {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                            Import secret key
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRevealSecret} className="mt-4 space-y-4">
                        {exportError && (
                            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{exportError}</p>
                        )}
                        {exported ? (
                            <div className={`${dash.panelInset} space-y-3 p-4`}>
                                <p className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                                    <ShieldAlert className="h-4 w-4" />
                                    Store this offline — do not share it
                                </p>
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={dash.sectionLabel}>Public key</p>
                                        <button
                                            type="button"
                                            onClick={() => copyText(exported.publicKey, 'public')}
                                            className="text-xs text-[var(--brand-accent)] hover:underline"
                                        >
                                            {copiedField === 'public' ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                    <code className="mt-1 block break-all font-mono text-xs text-white/75">{exported.publicKey}</code>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={dash.sectionLabel}>Secret key</p>
                                        <button
                                            type="button"
                                            onClick={() => copyText(exported.secretKey, 'secret')}
                                            className="inline-flex items-center gap-1 text-xs text-[var(--brand-accent)] hover:underline"
                                        >
                                            {copiedField === 'secret' ? (
                                                <>
                                                    <Check className="h-3 w-3" /> Copied
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-3 w-3" /> Copy
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <code className="mt-1 block break-all font-mono text-xs text-[var(--brand-accent)]">{exported.secretKey}</code>
                                </div>
                                <button type="button" onClick={() => setExported(null)} className={dash.ctaSecondary}>
                                    Hide secret key
                                </button>
                            </div>
                        ) : (
                            <>
                                <label className="flex cursor-pointer items-start gap-2 text-sm text-white/65">
                                    <input
                                        type="checkbox"
                                        checked={acknowledgeRisk}
                                        onChange={(e) => setAcknowledgeRisk(e.target.checked)}
                                        className="mt-1"
                                    />
                                    <span>I understand anyone with my secret key can take my funds.</span>
                                </label>
                                <AuthPasswordField
                                    id="export-password"
                                    label="Enter your password to show secret key"
                                    value={exportPassword}
                                    onChange={setExportPassword}
                                    autoComplete="current-password"
                                />
                                {!isSelfCustody && exportOtpStep && (
                                    <div>
                                        <label htmlFor="export-otp" className={dash.sectionLabel}>
                                            Email code {exportMaskedEmail ? `(sent to ${exportMaskedEmail})` : ''}
                                        </label>
                                        <input
                                            id="export-otp"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            maxLength={6}
                                            value={exportConfirmCode}
                                            onChange={(e) => setExportConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            className="mt-1 w-full max-w-xs rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-lg tracking-widest text-white/90 outline-none focus:border-[var(--brand-accent)]"
                                            placeholder="000000"
                                        />
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={
                                        exportLoading ||
                                        !exportPassword ||
                                        !acknowledgeRisk ||
                                        walletMismatch ||
                                        (!isSelfCustody && exportOtpStep && exportConfirmCode.length !== 6)
                                    }
                                    className={dash.ctaSecondary}
                                >
                                    {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                                    {!isSelfCustody && !exportOtpStep ? 'Send email code' : 'Show secret key'}
                                </button>
                            </>
                        )}
                    </form>
                )}
            </DashboardCard>
        </div>
    );
}
