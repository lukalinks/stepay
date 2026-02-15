'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserCircle, Mail, Phone, MapPin, CreditCard, Loader2, Pencil } from 'lucide-react';
import { Message } from '@/components/Message';

interface ProfileData {
    fullName?: string;
    phone?: string;
    email?: string;
    address?: string;
    idDocumentType?: string;
    idDocumentNumber?: string;
    walletPublic?: string;
    isProfileComplete?: boolean;
}

function ProfileField({ icon: Icon, label, value, placeholder = '—' }: { icon: React.ElementType; label: string; value?: string | null; placeholder?: string }) {
    const display = (value ?? '').toString().trim() || placeholder;
    return (
        <div className="flex gap-4 py-4 border-b border-slate-200/60 last:border-0">
            <div className="flex shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Icon className="w-5 h-5 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                <p className={`mt-0.5 text-base ${display === placeholder ? 'text-slate-400' : 'text-slate-800'}`}>
                    {display}
                </p>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/user/profile')
            .then((res) => {
                if (res.status === 401) return null;
                return res.json();
            })
            .then((data) => {
                if (data) setProfile(data);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="py-8 text-center text-slate-500">
                <p>Could not load your profile.</p>
                <Link href="/dashboard" className="mt-2 inline-block text-teal-600 hover:underline">Back to dashboard</Link>
            </div>
        );
    }

    const idTypeLabel = profile.idDocumentType === 'passport' ? 'Passport' : 'NRC';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Profile</h1>
                    <p className="mt-1 text-slate-600">View and manage your account details</p>
                </div>
                <Link
                    href={`/profile/complete?next=${encodeURIComponent('/dashboard/profile')}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                    <Pencil className="w-4 h-4" />
                    Edit profile
                </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="p-4 sm:p-6">
                    <ProfileField icon={UserCircle} label="Full name" value={profile.fullName} />
                    <ProfileField icon={Mail} label="Email" value={profile.email} />
                    <ProfileField icon={Phone} label="Phone number" value={profile.phone} placeholder="Not set" />
                    <ProfileField icon={MapPin} label="Address" value={profile.address} placeholder="Not set" />
                    <ProfileField icon={CreditCard} label={`${idTypeLabel} number`} value={profile.idDocumentNumber} placeholder="Not set" />
                </div>
            </div>

            {!profile.isProfileComplete && (
                <Message variant="warning" title="Profile incomplete">
                    Complete your profile to deposit and cash out.{' '}
                    <Link href="/profile/complete?next=/dashboard/profile" className="text-teal-600 font-medium hover:underline">
                        Complete now →
                    </Link>
                </Message>
            )}
        </div>
    );
}
