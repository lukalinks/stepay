'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserCircle, Mail, Phone, MapPin, CreditCard, Loader2, Pencil, Settings, CheckCircle2 } from 'lucide-react';
import { Message } from '@/components/Message';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { UserAvatar } from '@/components/UserAvatar';
import { dash } from '@/lib/dashboard-ui';
import { getMarket } from '@/lib/markets';

interface ProfileData {
    fullName?: string;
    phone?: string;
    email?: string;
    address?: string;
    countryCode?: string;
    idDocumentType?: string;
    idDocumentNumber?: string;
    isProfileComplete?: boolean;
}

function ProfileField({
    icon: Icon,
    label,
    value,
    placeholder = 'Not set',
}: {
    icon: React.ElementType;
    label: string;
    value?: string | null;
    placeholder?: string;
}) {
    const display = (value ?? '').toString().trim() || placeholder;
    const empty = display === placeholder;

    return (
        <div className={`${dash.holdingRow} !border-white/[0.06] !px-0 !py-3.5 !bg-transparent hover:!from-transparent`}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className={`${dash.iconBadge} !h-10 !w-10 !rounded-xl`}>
                    <Icon className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0">
                    <p className={dash.sectionLabel}>{label}</p>
                    <p className={`mt-1 text-sm font-medium ${empty ? 'text-white/35' : 'text-white/90'}`}>{display}</p>
                </div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/user/profile')
            .then((res) => (res.status === 401 ? null : res.json()))
            .then((data) => {
                if (data) setProfile(data);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <Loader2 className={`${dash.spinner} h-8 w-8`} />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className={`${dash.errorPanel} mt-8`}>
                <p className="text-white/55 mb-4">Could not load your profile.</p>
                <Link href="/dashboard" className={dash.cta}>
                    Back to overview
                </Link>
            </div>
        );
    }

    const market = getMarket(profile.countryCode ?? 'ZM');
    const idTypeLabel =
        market.idDocumentTypes.find((t) => t.id === profile.idDocumentType)?.label ??
        (profile.idDocumentType === 'passport' ? 'Passport' : 'ID');
    const editHref = `/profile/complete?next=${encodeURIComponent('/dashboard/profile')}`;

    return (
        <div className={`${dash.pageWrap} ${dash.sectionGap}`}>
            <DashboardCard noPadding bodyClassName="p-0">
                <div className={`${dash.cardHeader} !items-start sm:!items-center`}>
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <UserAvatar fullName={profile.fullName} email={profile.email} size={48} />
                        <div className="min-w-0">
                            <h2 className={`${dash.cardTitle} !text-base sm:!text-lg`}>
                                {profile.fullName?.trim() || 'Your account'}
                            </h2>
                            <p className={dash.cardSubtitle}>{profile.email || 'No email on file'}</p>
                            {profile.isProfileComplete ? (
                                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--brand-accent-muted)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--brand-accent)] ring-1 ring-[var(--brand-accent-border)]">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Profile complete
                                </span>
                            ) : (
                                <span className="mt-2 inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-400 ring-1 ring-amber-500/20">
                                    Incomplete
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <Link href="/dashboard/settings" className={dash.ctaSecondary}>
                            <Settings className="h-4 w-4" />
                            Settings
                        </Link>
                        <Link href={editHref} className={dash.cta}>
                            <Pencil className="h-4 w-4" />
                            Edit
                        </Link>
                    </div>
                </div>
            </DashboardCard>

            <DashboardCard title="Account details" subtitle="Personal and verification information" noPadding bodyClassName="px-5 sm:px-6">
                <ProfileField icon={UserCircle} label="Full name" value={profile.fullName} />
                <ProfileField icon={Mail} label="Email" value={profile.email} />
                <ProfileField icon={Phone} label="Phone" value={profile.phone} />
                <ProfileField icon={MapPin} label="Address" value={profile.address} />
                <ProfileField icon={CreditCard} label={`${idTypeLabel} number`} value={profile.idDocumentNumber} />
            </DashboardCard>

            {!profile.isProfileComplete && (
                <Message variant="warning" title="Profile incomplete" dark>
                    Complete your profile to deposit and cash out.{' '}
                    <Link href={editHref} className={`font-semibold ${dash.accentLink}`}>
                        Complete now
                    </Link>
                </Message>
            )}
        </div>
    );
}
