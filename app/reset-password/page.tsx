'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Logo } from '@/components/Logo';
import { Header } from '@/components/Header';
import { Loader2 } from 'lucide-react';
import { getSupabaseClientConfig } from '@/lib/supabase-client';

function ResetPasswordContent() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);
    const [invalidLink, setInvalidLink] = useState(false);
    const [authNotConfigured, setAuthNotConfigured] = useState(false);

    useEffect(() => {
        const config = getSupabaseClientConfig();
        if (!config) {
            setAuthNotConfigured(true);
            setReady(true);
            return;
        }

        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const type = params.get('type');
        const accessToken = params.get('access_token');

        if (type !== 'recovery' || !accessToken) {
            setInvalidLink(true);
            setReady(true);
            return;
        }

        const supabase = createClient(config.url, config.anonKey);

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setReady(true);
                return;
            }
            supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: params.get('refresh_token') || '',
            }).then(({ error }) => {
                setReady(true);
                if (error) setInvalidLink(true);
            });
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Your passwords don\'t match. Please type them again.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const config = getSupabaseClientConfig();
            if (!config) {
                setError('Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.');
                setIsLoading(false);
                return;
            }

            const supabase = createClient(config.url, config.anonKey);
            const { error: err } = await supabase.auth.updateUser({ password });

            if (err) {
                setError(err.message || 'Failed to update password. The link may have expired.');
                setIsLoading(false);
                return;
            }

            await supabase.auth.signOut();
            router.replace('/login?message=password-reset');
        } catch {
            setError('Something went wrong. Please try again.');
            setIsLoading(false);
        }
    };

    if (!ready) {
        return (
            <div className="min-h-screen flex flex-col bg-[#faf9f7]">
                <Header showBack maxWidth="content" />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
                </div>
            </div>
        );
    }

    if (authNotConfigured) {
        return (
            <div className="min-h-screen flex flex-col bg-[#faf9f7]">
                <Header showBack maxWidth="content" />
                <div className="flex-1 flex items-center justify-center stepay-dots px-4 py-8">
                    <div className="w-full max-w-md text-center">
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 p-8">
                            <Logo iconOnly size="lg" variant="light" className="mx-auto mb-6" />
                            <h1 className="text-xl font-bold text-slate-900">Auth not configured</h1>
                            <p className="mt-2 text-slate-600">
                                Add <code className="text-sm bg-slate-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
                                <code className="text-sm bg-slate-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your environment variables (e.g. in Vercel).
                            </p>
                            <Link href="/login" className="mt-6 inline-block text-teal-600 text-sm font-medium hover:underline">
                                Back to sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (invalidLink) {
        return (
            <div className="min-h-screen flex flex-col bg-[#faf9f7]">
                <Header showBack maxWidth="content" />
                <div className="flex-1 flex items-center justify-center stepay-dots px-4 py-8">
                    <div className="w-full max-w-md text-center">
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 p-8">
                            <Logo iconOnly size="lg" variant="light" className="mx-auto mb-6" />
                            <h1 className="text-xl font-bold text-slate-900">Link expired or invalid</h1>
                            <p className="mt-2 text-slate-600">
                                This reset link has expired or already been used. Request a new one.
                            </p>
                            <Link href="/forgot-password" className="mt-6 inline-block w-full min-h-[48px] py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors">
                                Get new reset link
                            </Link>
                            <Link href="/login" className="mt-3 inline-block text-teal-600 text-sm font-medium hover:underline">
                                Back to sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#faf9f7]">
            <Header showBack maxWidth="content" />
            <div className="flex-1 flex items-center justify-center stepay-dots px-4 py-8 sm:py-12">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200/60 p-6 sm:p-8 sm:rounded-tl-[2rem]">
                        <div className="text-center mb-6 sm:mb-8">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-100">
                                <Logo iconOnly size="lg" variant="light" />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-heading">Set new password</h1>
                            <p className="text-slate-500 mt-1 sm:mt-2 text-sm sm:text-base">Choose a strong password (at least 6 characters)</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                            {error && (
                                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm" role="alert">
                                    <p className="font-medium">Something went wrong</p>
                                    <p className="mt-1">{error}</p>
                                </div>
                            )}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">New password</label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                                    className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-base sm:text-lg transition-all bg-white"
                                    placeholder="••••••••"
                                    minLength={6}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">Confirm password</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                                    className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-base sm:text-lg transition-all bg-white"
                                    placeholder="••••••••"
                                    minLength={6}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full min-h-[52px] bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99] shadow-lg shadow-teal-500/25 disabled:opacity-70"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset password'}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-slate-600 text-sm">
                            <Link href="/login" className="text-teal-600 font-medium hover:underline">Back to sign in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#faf9f7]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
