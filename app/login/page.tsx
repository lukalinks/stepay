'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { Header } from '@/components/Header';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function toFriendlyAuthError(msg?: string, action: string = 'sign in'): string {
    if (!msg) return `We couldn't ${action}. Please try again.`;
    const m = msg.toLowerCase();
    if (m.includes('invalid') && (m.includes('credentials') || m.includes('email') || m.includes('password'))) return 'Invalid email or password. Please check and try again.';
    if (m.includes('user not found') || m.includes('email not found')) return 'We don\'t have an account with that email. Try signing up first.';
    if (m.includes('unauthorized')) return 'Your session may have expired. Please sign in again.';
    if (m.includes('too many') || m.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.';
    if (m.includes('network') || m.includes('connection')) return 'We couldn\'t reach our servers. Please check your connection.';
    return msg;
}

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('next') || '/dashboard';
    const errorParam = searchParams.get('error');
    const messageParam = searchParams.get('message');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(() =>
        errorParam ? decodeURIComponent(errorParam.replace(/\+/g, ' ')) : null
    );

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                const target = redirectTo.startsWith('/') ? redirectTo : '/dashboard';
                router.push(target);
            } else {
                setError(toFriendlyAuthError(data.error, 'sign in'));
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
            <div className="flex-1 flex items-center justify-center stepay-dots px-4 py-8 sm:py-12">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200/60 p-6 sm:p-8 sm:rounded-tl-[2rem]">
                        <div className="text-center mb-6 sm:mb-8">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-100">
                                <Logo iconOnly size="lg" variant="light" />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-heading">Welcome to Stepay</h1>
                            <p className="text-slate-500 mt-1 sm:mt-2 text-sm sm:text-base">Enter your email and password to sign in</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
                            {messageParam === 'password-reset' && (
                                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm" role="status">
                                    <p className="font-medium">Password reset successful</p>
                                    <p className="mt-1">Sign in with your new password.</p>
                                </div>
                            )}
                            {error && (
                                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm" role="alert">
                                    <p className="font-medium">We couldn't sign you in</p>
                                    <p className="mt-1">{error}</p>
                                </div>
                            )}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-base sm:text-lg transition-all bg-white"
                                    placeholder="you@example.com"
                                    inputMode="email"
                                    required
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
                                    <Link href="/forgot-password" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                                        Forgot password?
                                    </Link>
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-base sm:text-lg transition-all bg-white"
                                    placeholder="••••••••"
                                    minLength={6}
                                    required
                                />
                                <p className="text-xs text-slate-500 mt-1.5">At least 6 characters</p>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full min-h-[52px] bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99] shadow-lg shadow-teal-500/25 disabled:opacity-70"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign in'}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-slate-600 text-sm">
                            Don&apos;t have an account?{' '}
                            <Link href={`/signup${redirectTo !== '/dashboard' ? `?next=${encodeURIComponent(redirectTo)}` : ''}`} className="text-teal-600 font-medium hover:underline">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#faf9f7]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
