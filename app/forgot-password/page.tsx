'use client';

import { useState } from 'react';
import Link from 'next/link';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';
import { Mail } from 'lucide-react';
import { AuthFormError } from '@/components/auth/AuthAlert';
import { AuthShell } from '@/components/auth/AuthShell';
import { authTextFieldSx, BRAND, primaryCtaSx } from '@/lib/brand';

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
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: trimmed }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.');
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
            <AuthShell title="Check your email" subtitle={`If an account exists for ${email}, we've sent a link to reset your password.`}>
                <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center' }}>
                    <Box
                        sx={{
                            width: 64,
                            height: 64,
                            borderRadius: 3,
                            bgcolor: BRAND.accentMuted,
                            border: `1px solid ${alpha(BRAND.accent, 0.25)}`,
                            display: 'grid',
                            placeItems: 'center',
                        }}
                    >
                        <Mail size={28} color={BRAND.accent} />
                    </Box>
                    <Typography sx={{ color: BRAND.textMuted, fontSize: '0.9375rem', lineHeight: 1.65 }}>
                        Didn&apos;t receive it? Check spam or{' '}
                        <MuiLink
                            component="button"
                            type="button"
                            onClick={() => {
                                setSent(false);
                                setError(null);
                            }}
                            sx={{ fontWeight: 600, color: BRAND.accent, border: 'none', bgcolor: 'transparent', cursor: 'pointer', font: 'inherit' }}
                        >
                            try again
                        </MuiLink>
                    </Typography>
                    <Button component={Link} href="/login" fullWidth sx={primaryCtaSx}>
                        Back to sign in
                    </Button>
                </Stack>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title="Forgot password?"
            subtitle="Enter your email and we'll send you a link to reset it."
            footer={
                <>
                    Remember your password?{' '}
                    <MuiLink component={Link} href="/login" sx={{ fontWeight: 700, color: BRAND.accent }}>
                        Sign in
                    </MuiLink>
                </>
            }
        >
            <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2.5}>
                    {error && <AuthFormError>{error}</AuthFormError>}
                    <TextField
                        label="Email"
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setError(null);
                        }}
                        placeholder="you@example.com"
                        required
                        fullWidth
                        autoFocus
                        sx={authTextFieldSx}
                        slotProps={{ htmlInput: { inputMode: 'email', autoComplete: 'email' } }}
                    />
                    <Button type="submit" variant="contained" disabled={isLoading} fullWidth sx={primaryCtaSx}>
                        {isLoading ? <CircularProgress size={24} sx={{ color: BRAND.accentContrast }} /> : 'Send reset link'}
                    </Button>
                </Stack>
            </Box>
        </AuthShell>
    );
}
