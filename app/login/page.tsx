'use client';

import { useState, Suspense } from 'react';
import { Logo } from '@/components/Logo';
import { Header } from '@/components/Header';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function LoginForm() {
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('next') || '/dashboard';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                const target = redirectTo.startsWith('/') ? redirectTo : '/dashboard';
                router.push(target);
            } else {
                setError(data.error || `Login failed (${res.status})`);
            }
        } catch (err) {
            console.error(err);
            setError('Network error. Check your connection.');
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
                            <p className="text-slate-500 mt-1 sm:mt-2 text-sm sm:text-base">Enter your mobile number to continue</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
                            {error && (
                                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">Mobile Number</label>
                                <input
                                    id="phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-base sm:text-lg transition-all bg-white"
                                    placeholder="097xxxxxxx"
                                    inputMode="tel"
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
                        </form>
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
