'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { Header } from '@/components/Header';
import { Message } from '@/components/Message';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function toFriendlyAuthError(msg?: string): string {
    if (!msg) return 'Something went wrong. Please try again.';
    const m = msg.toLowerCase();
    if (m.includes('already') || m.includes('email') && m.includes('exists')) return 'An account with this email already exists. Try signing in instead.';
    if (m.includes('invalid') && m.includes('email')) return 'Please enter a valid email address.';
    if (m.includes('password') && (m.includes('short') || m.includes('weak') || m.includes('length'))) return 'Your password should be at least 6 characters long.';
    if (m.includes('network') || m.includes('connection')) return 'We couldn\'t reach our servers. Please check your connection.';
    return msg;
}

function SignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('next') || '/dashboard';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError('Your passwords don\'t match. Please type them again to make sure they\'re the same.');
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                const target = redirectTo.startsWith('/') ? redirectTo : '/dashboard';
                router.push(target);
            } else {
                setError(toFriendlyAuthError(data.error));
            }
        } catch (err) {
            console.error(err);
            setError('We couldn\'t reach our servers. Please check your internet connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

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
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-heading">Create account</h1>
                            <p className="text-slate-500 mt-1 sm:mt-2 text-sm sm:text-base">Sign up to start depositing and cashing out crypto</p>
                        </div>

                        <form onSubmit={handleSignup} className="space-y-6">
                            {error && (
                                <Message variant="error">{error}</Message>
                            )}
                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-sm font-semibold text-slate-700">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25 outline-none text-base transition-all placeholder:text-slate-400"
                                    placeholder="you@example.com"
                                    inputMode="email"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">Password</label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25 outline-none text-base transition-all placeholder:text-slate-400"
                                    placeholder="••••••••"
                                    minLength={6}
                                    required
                                />
                                <p className="text-xs text-slate-500">At least 6 characters</p>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700">Confirm password</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25 outline-none text-base transition-all placeholder:text-slate-400"
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
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create account'}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-slate-600 text-sm">
                            Already have an account?{' '}
                            <Link href={`/login${redirectTo !== '/dashboard' ? `?next=${encodeURIComponent(redirectTo)}` : ''}`} className="text-teal-600 font-medium hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#faf9f7]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        }>
            <SignupForm />
        </Suspense>
    );
}
