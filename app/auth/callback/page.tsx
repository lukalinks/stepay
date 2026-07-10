'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { BRAND, primaryCtaSx } from '@/lib/brand';

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const completeLogin = async () => {
            const hash = typeof window !== 'undefined' ? window.location.hash : '';
            const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
            const tokenFromHash = hashParams.get('access_token');
            const tokenFromQuery = searchParams.get('token');
            let token = tokenFromHash || tokenFromQuery;

            if (!token && typeof window !== 'undefined') {
                const q = new URLSearchParams(window.location.search);
                token = q.get('token');
            }

            if (!token) {
                setError(
                    'Invalid or missing sign-in token. Please sign in with your email and password, or use the link from your password reset email.'
                );
                return;
            }

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
                setError(data.error || "We couldn't complete sign-in. Please try again.");
                return;
            }

            const target = next.startsWith('/') ? next : '/dashboard';
            router.replace(target);
        };

        completeLogin();
    }, [router, searchParams]);

    if (error) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: BRAND.bg,
                    px: 3,
                    background: `radial-gradient(ellipse 60% 40% at 50% 0%, rgba(201, 169, 98, 0.12) 0%, transparent 55%), ${BRAND.bg}`,
                }}
            >
                <Logo iconOnly size="lg" variant="neon" className="mb-6" />
                <Typography sx={{ color: 'rgba(255,255,255,0.75)', textAlign: 'center', mb: 3, maxWidth: 360, lineHeight: 1.6 }}>
                    {error}
                </Typography>
                <Button component={Link} href="/login" variant="contained" sx={{ ...primaryCtaSx, px: 4 }}>
                    Back to sign in
                </Button>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: BRAND.bg,
                px: 3,
                background: `radial-gradient(ellipse 60% 40% at 50% 0%, rgba(201, 169, 98, 0.12) 0%, transparent 55%), ${BRAND.bg}`,
            }}
        >
            <Stack spacing={2} sx={{ alignItems: 'center' }}>
                <CircularProgress sx={{ color: BRAND.accent }} size={40} />
                <Typography sx={{ color: BRAND.textMuted }}>Signing you in…</Typography>
            </Stack>
        </Box>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: BRAND.bg }}>
                    <CircularProgress sx={{ color: BRAND.accent }} />
                </Box>
            }
        >
            <AuthCallbackContent />
        </Suspense>
    );
}
