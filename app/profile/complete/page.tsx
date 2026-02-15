'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { Header } from '@/components/Header';
import { Message } from '@/components/Message';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function ProfileCompleteForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextPath = searchParams.get('next') || '/dashboard';
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [idDocumentType, setIdDocumentType] = useState<'nrc' | 'passport'>('nrc');
    const [idDocumentNumber, setIdDocumentNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/user/profile')
            .then((res) => {
                if (res.status === 401) {
                    const returnTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/profile/complete';
                    router.replace(`/login?next=${encodeURIComponent(returnTo)}`);
                    return null;
                }
                return res.json();
            })
            .then((data) => {
                if (!data) return;
                if (data.isProfileComplete) {
                    const target = nextPath.startsWith('/') ? nextPath : '/dashboard';
                    router.replace(target);
                    return;
                }
                setFullName(data.fullName || '');
                setPhone(data.phone || '');
                setAddress(data.address || '');
                setIdDocumentType((data.idDocumentType === 'passport' ? 'passport' : 'nrc'));
                setIdDocumentNumber(data.idDocumentNumber || '');
            })
            .catch(() => router.replace('/login'))
            .finally(() => setIsChecking(false));
    }, [router, nextPath]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: fullName.trim(),
                    phone: phone.trim(),
                    address: address.trim(),
                    idDocumentType,
                    idDocumentNumber: idDocumentNumber.trim(),
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.success !== false) {
                const target = nextPath.startsWith('/') ? nextPath : '/dashboard';
                router.push(target);
            } else {
                setError(data.error || 'Failed to save. Please try again.');
            }
        } catch (err) {
            console.error(err);
            setError('We couldn\'t reach our servers. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isChecking) {
        return (
            <div className="min-h-screen flex flex-col bg-[#faf9f7]">
                <Header showBack maxWidth="content" />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#faf9f7]">
            <Header showBack maxWidth="content" />
            <div className="flex-1 flex items-start sm:items-center justify-center stepay-dots px-4 pt-4 pb-8 sm:py-12">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200/60 p-6 sm:p-8 sm:rounded-tl-[2rem]">
                        <div className="text-center mb-6 sm:mb-8">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-100">
                                <Logo iconOnly size="lg" variant="light" />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-heading">Complete your profile</h1>
                            <p className="text-slate-500 mt-1 sm:mt-2 text-sm sm:text-base">We need a few details before you can continue</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                            {error && (
                                <Message variant="warning" title="Something went wrong">
                                    {error}
                                </Message>
                            )}
                            <div>
                                <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-2">Full name</label>
                                <input
                                    id="fullName"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-base sm:text-lg transition-all bg-white"
                                    placeholder="John Mwale"
                                    minLength={2}
                                    maxLength={100}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">Phone number</label>
                                <input
                                    id="phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-base sm:text-lg transition-all bg-white"
                                    placeholder="0971234567"
                                    inputMode="numeric"
                                    required
                                />
                                <p className="text-xs text-slate-500 mt-1.5">Zambian mobile number for Mobile Money</p>
                            </div>
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                                <textarea
                                    id="address"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="w-full px-4 py-3.5 min-h-[80px] rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-base sm:text-lg transition-all bg-white resize-none"
                                    placeholder="House number, street, town, province"
                                    minLength={10}
                                    maxLength={500}
                                    required
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label htmlFor="idDocumentType" className="block text-sm font-medium text-slate-700 mb-2">ID document type</label>
                                <select
                                    id="idDocumentType"
                                    value={idDocumentType}
                                    onChange={(e) => setIdDocumentType(e.target.value as 'nrc' | 'passport')}
                                    className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-base sm:text-lg transition-all bg-white"
                                    required
                                >
                                    <option value="nrc">NRC (National Registration Card)</option>
                                    <option value="passport">Passport</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="idDocumentNumber" className="block text-sm font-medium text-slate-700 mb-2">
                                    {idDocumentType === 'nrc' ? 'NRC number' : 'Passport number'}
                                </label>
                                <input
                                    id="idDocumentNumber"
                                    type="text"
                                    value={idDocumentNumber}
                                    onChange={(e) => setIdDocumentNumber(e.target.value)}
                                    className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-base sm:text-lg transition-all bg-white"
                                    placeholder={idDocumentType === 'nrc' ? '123456/78/9' : 'AB123456'}
                                    minLength={5}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full min-h-[52px] bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99] shadow-lg shadow-teal-500/25 disabled:opacity-70"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
                            </button>
                            <p className="mt-4 text-center text-slate-600 text-sm">
                                <Link
                                    href={nextPath.startsWith('/') ? nextPath : '/dashboard'}
                                    className="text-teal-600 hover:text-teal-700 font-medium"
                                >
                                    Complete later
                                </Link>
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ProfileCompletePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#faf9f7]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        }>
            <ProfileCompleteForm />
        </Suspense>
    );
}
