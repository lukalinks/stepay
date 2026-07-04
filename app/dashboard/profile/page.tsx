'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserCircle, Mail, Phone, MapPin, CreditCard, Loader2, Pencil, KeyRound, ShieldAlert, Copy, Check } from 'lucide-react';
import { Message } from '@/components/Message';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { PayLinkPanel } from '@/components/dashboard/PayLinkPanel';
import { dash } from '@/lib/dashboard-ui';
import { getLocalWalletPublicKey, markSecretRevealed, revealLocalWalletSecret } from '@/lib/client-wallet';
import { AuthPasswordField } from '@/components/auth/AuthPasswordField';

interface ProfileData {
    fullName?: string;
    phone?: string;
    email?: string;
    address?: string;
    idDocumentType?: string;
    idDocumentNumber?: string;
    walletPublic?: string;
    walletCustody?: 'self' | 'hosted';
    isProfileComplete?: boolean;
}

function ProfileField({ icon: Icon, label, value, placeholder = '—' }: { icon: React.ElementType; label: string; value?: string | null; placeholder?: string }) {
    const display = (value ?? '').toString().trim() || placeholder;
    return (
        <div className="flex gap-4 border-b border-white/[0.06] py-4 last:border-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]">
                <Icon className="h-[18px] w-[18px] text-white/40" />
            </div>
            <div className="min-w-0 flex-1">
                <p className={dash.sectionLabel}>{label}</p>
                <p className={`mt-1 text-sm ${display === placeholder ? 'text-white/30' : 'text-white/90'}`}>{display}</p>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [exportPassword, setExportPassword] = useState('');
    const [exportLoading, setExportLoading] = useState(false);
    const [exportError, setExportError] = useState('');
    const [exported, setExported] = useState<{ publicKey: string; secretKey: string } | null>(null);
    const [copiedField, setCopiedField] = useState<'public' | 'secret' | null>(null);
    const [acknowledgeRisk, setAcknowledgeRisk] = useState(false);

    useEffect(() => {
        if (!exported) return;
        const timer = window.setTimeout(() => setExported(null), 60_000);
        return () => window.clearTimeout(timer);
    }, [exported]);

    useEffect(() => {
        fetch('/api/user/profile')
            .then((res) => (res.status === 401 ? null : res.json()))
            .then((data) => { if (data) setProfile(data); })
            .finally(() => setLoading(false));
    }, []);

    const copyText = async (text: string, field: 'public' | 'secret') => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            window.setTimeout(() => setCopiedField(null), 2000);
        } catch {
            // ignore
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <Loader2 className={dash.spinner} />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="py-12 text-center text-white/45">
                <p>Could not load your profile.</p>
                <Link href="/dashboard" className={`mt-2 inline-block ${dash.accentLink}`}>Back to overview</Link>
            </div>
        );
    }

    const idTypeLabel = profile.idDocumentType === 'passport' ? 'Passport' : 'NRC';
    const isSelfCustody = profile.walletCustody !== 'hosted';
    const walletPublic = profile.walletPublic || getLocalWalletPublicKey() || '';

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
                const keys = await revealLocalWalletSecret(exportPassword);
                setExported(keys);
                markSecretRevealed();
                setExportPassword('');
                setAcknowledgeRisk(false);
                return;
            }

            const res = await fetch('/api/user/wallet-export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: exportPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setExported({ publicKey: data.publicKey, secretKey: data.secretKey });
                markSecretRevealed();
                setExportPassword('');
                setAcknowledgeRisk(false);
            } else {
                setExportError(data.error || 'Could not show secret key.');
            }
        } catch (err) {
            setExportError(err instanceof Error ? err.message : 'Could not show secret key.');
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <div className={`${dash.pageWrap} space-y-6`}>
            <div className="flex justify-end lg:hidden">
                <Link href={`/profile/complete?next=${encodeURIComponent('/dashboard/profile')}`} className={dash.cta}>
                    <Pencil className="h-4 w-4" />
                    Edit profile
                </Link>
            </div>

            <DashboardCard
                title="Account details"
                action={
                    <Link href={`/profile/complete?next=${encodeURIComponent('/dashboard/profile')}`} className={`hidden lg:inline-flex ${dash.ctaSecondary}`}>
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Link>
                }
                noPadding
                bodyClassName="px-5 sm:px-6"
            >
                <ProfileField icon={UserCircle} label="Full name" value={profile.fullName} />
                <ProfileField icon={Mail} label="Email" value={profile.email} />
                <ProfileField icon={Phone} label="Phone" value={profile.phone} placeholder="Not set" />
                <ProfileField icon={MapPin} label="Address" value={profile.address} placeholder="Not set" />
                <ProfileField icon={CreditCard} label={`${idTypeLabel} number`} value={profile.idDocumentNumber} placeholder="Not set" />
            </DashboardCard>

            {!profile.isProfileComplete && (
                <Message variant="warning" title="Profile incomplete" dark>
                    Complete your profile to deposit and cash out.{' '}
                    <Link href="/profile/complete?next=/dashboard/profile" className={`font-semibold ${dash.accentLink}`}>
                        Complete now →
                    </Link>
                </Message>
            )}

            <DashboardCard title="Receive payments" subtitle="QR code & pay link — merchant-ready.">
                <PayLinkPanel />
            </DashboardCard>

            <div id="wallet-security">
                <DashboardCard
                    title="Wallet"
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

                    {walletPublic && (
                        <div className={`${dash.panelInset} mt-4 p-4`}>
                            <p className={dash.sectionLabel}>Public address</p>
                            <code className="mt-1 block break-all font-mono text-xs text-white/75">{walletPublic}</code>
                        </div>
                    )}

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
                                <button
                                    type="submit"
                                    disabled={exportLoading || !exportPassword || !acknowledgeRisk}
                                    className={dash.ctaSecondary}
                                >
                                    {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                                    Show secret key
                                </button>
                            </>
                        )}
                    </form>
                </DashboardCard>
            </div>
        </div>
    );
}
