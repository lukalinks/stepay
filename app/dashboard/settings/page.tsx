'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { WalletSecretPanel } from '@/components/wallet/WalletSecretPanel';
import { Sep10WalletProve } from '@/components/wallet/Sep10WalletProve';
import { CloudBackupSettings } from '@/components/wallet/CloudBackupSettings';
import { dash } from '@/lib/dashboard-ui';
import { isStaleSessionAfterSignup, syncClientAccountSession } from '@/lib/client-account-sync';
interface SettingsProfile {
    userId?: string;
    email?: string;
    walletPublic?: string;
    walletCustody?: 'self' | 'hosted';
    hasCloudBackup?: boolean;
    cloudBackupEnabled?: boolean;
}

export default function SettingsPage() {
    const [profile, setProfile] = useState<SettingsProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = () => {
        fetch(`/api/user/profile?_=${Date.now()}`, { credentials: 'include', cache: 'no-store' })
            .then(async (res) => {
                if (res.status === 401) {
                    window.location.href = '/login?next=/dashboard/settings';
                    return null;
                }
                if (!res.ok) return null;
                return res.json();
            })
            .then((data) => {
                if (!data) return;
                if (typeof data.userId === 'string') {
                    if (isStaleSessionAfterSignup(data.userId)) {
                        const emailQs =
                            typeof data.email === 'string' && data.email.includes('@')
                                ? `&email=${encodeURIComponent(data.email)}`
                                : '';
                        void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(() => {
                            window.location.href = `/login?error=session${emailQs}`;
                        });
                        return;
                    }
                    syncClientAccountSession(data.userId);
                }
                setProfile(data);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadProfile();
    }, []);

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
                <p>Could not load settings.</p>
                <div className="mt-3 flex justify-center">
                    <BackButton href="/dashboard" label="Back to overview" variant="dark" />
                </div>
            </div>
        );
    }

    return (
        <div className={`${dash.pageWrap} space-y-6`}>
            <CloudBackupSettings
                cloudBackupEnabled={profile.cloudBackupEnabled !== false}
                hasCloudBackup={Boolean(profile.hasCloudBackup)}
                walletCustody={profile.walletCustody}
                onUpdated={loadProfile}
            />
            <WalletSecretPanel
                walletPublic={profile.walletPublic}
                walletCustody={profile.walletCustody}
                accountEmail={profile.email}
            />
            {profile.walletCustody !== 'hosted' && (
                <Sep10WalletProve serverWalletPublic={profile.walletPublic} />
            )}
        </div>
    );
}
