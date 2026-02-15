'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const completeLogin = async () => {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (!supabaseUrl || !supabaseAnonKey) {
                setError('We\'re still setting things up. Please try again in a few moments.');
                return;
            }

            const supabase = createClient(supabaseUrl, supabaseAnonKey);

            // Supabase magic link redirects with hash: #access_token=...&refresh_token=...&type=magiclink
            // Parse hash for access_token (client-only, not sent to server)
            const hash = typeof window !== 'undefined' ? window.location.hash : '';
            const params = new URLSearchParams(hash.replace(/^#/, ''));
            const accessToken = params.get('access_token');

            let token = accessToken;

            if (!token) {
                // Fallback: client may have stored session from hash
                const { data: { session } } = await supabase.auth.getSession();
                token = session?.access_token ?? null;
            }

            if (!token) {
                setError('This sign-in link has expired or already been used. Please request a new one from the login page.');
                return;
            }

            // Call our API to create/find app user and set stepay_user cookie
            const next = searchParams.get('next') || '/dashboard';
            const res = await fetch('/api/auth/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accessToken: token,
                    next,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error || 'We couldn\'t complete sign-in. Please try again.');
                return;
            }

            const target = next.startsWith('/') ? next : '/dashboard';
            router.replace(target);
        };

        completeLogin();
    }, [router, searchParams]);

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
                <Logo iconOnly size="lg" variant="light" className="mb-6" />
                <p className="text-amber-800 text-center mb-6 max-w-sm">{error}</p>
                <a
                    href="/login"
                    className="text-teal-600 font-medium hover:underline"
                >
                    Back to sign in
                </a>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
            <Loader2 className="w-10 h-10 animate-spin text-teal-600 mb-4" />
            <p className="text-slate-600">Signing you in...</p>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
                <Loader2 className="w-10 h-10 animate-spin text-teal-600 mb-4" />
                <p className="text-slate-600">Signing you in...</p>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
