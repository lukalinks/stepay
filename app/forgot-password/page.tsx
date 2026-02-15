'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Logo } from '@/components/Logo';
import { getSupabaseClientConfig } from '@/lib/supabase-client';
import { Header } from '@/components/Header';
import { Message } from '@/components/Message';
import { Loader2, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = email.trim();
        if (!trimmed || !trimmed.includes('@')) {
            setError('Please enter a valid email address.');
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
            const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : '/reset-password';

            const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, {
                redirectTo,
            });

            if (err) {
                if (err.message.toLowerCase().includes('rate limit') || err.message.toLowerCase().includes('too many')) {
                    setError('Too many attempts. Please wait a few minutes and try again.');
                } else {
                    setError('Something went wrong. Please try again.');
                }
                setIsLoading(false);
                return;
            }

            setSent(true);
        } catch {
            setError('We couldn\'t reach our servers. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="min-h-screen flex flex-col bg-[#faf9f7]">
                <Header showBack maxWidth="content" />
                <div className="flex-1 flex items-start sm:items-center justify-center stepay-dots px-4 pt-4 pb-8 sm:py-12">
                    <div className="w-full max-w-md">
                        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200/60 p-6 sm:p-8 sm:rounded-tl-[2rem] text-center">
                            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Mail className="h-7 w-7 text-emerald-600" />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Check your email</h1>
                            <p className="mt-2 text-slate-600">
                                If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your password.
                            </p>
                            <p className="mt-4 text-sm text-slate-500">
                                Didn&apos;t receive it? Check spam or{' '}
                                <button type="button" onClick={() => { setSent(false); setError(null); }} className="text-teal-600 font-medium hover:underline">
                                    try again
                                </button>
                            </p>
                            <Link href="/login" className="mt-6 inline-block w-full min-h-[48px] py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors">
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
            <div className="flex-1 flex items-start sm:items-center justify-center stepay-dots px-4 pt-4 pb-8 sm:py-12">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200/60 p-6 sm:p-8 sm:rounded-tl-[2rem]">
                        <div className="text-center mb-6 sm:mb-8">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-100">
                                <Logo iconOnly size="lg" variant="light" />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-heading">Forgot password?</h1>
                            <p className="text-slate-500 mt-1 sm:mt-2 text-sm sm:text-base">Enter your email and we&apos;ll send you a link to reset it</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                            {error && (
                                <Message variant="warning" title="Something went wrong">
                                    {error}
                                </Message>
                            )}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                                    className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-base sm:text-lg transition-all bg-white"
                                    placeholder="you@example.com"
                                    inputMode="email"
                                    required
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full min-h-[52px] bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99] shadow-lg shadow-teal-500/25 disabled:opacity-70"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send reset link'}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-slate-600 text-sm">
                            Remember your password?{' '}
                            <Link href="/login" className="text-teal-600 font-medium hover:underline">Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
