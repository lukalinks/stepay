'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';
import { AuthFormError } from '@/components/auth/AuthAlert';
import { AuthShell } from '@/components/auth/AuthShell';
import { authTextFieldSx, BRAND, primaryCtaSx } from '@/lib/brand';

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token')?.trim() ?? '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            setError('Invalid reset link.');
            return;
        }
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
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(typeof data.error === 'string' ? data.error : 'Failed to update password. The link may have expired.');
                setIsLoading(false);
                return;
            }

            router.replace('/login?message=password-reset');
        } catch {
            setError('Something went wrong. Please try again.');
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <AuthShell title="Link expired or invalid" subtitle="Open the reset link from your email, or request a new one.">
                <Stack spacing={2}>
                    <Button component={Link} href="/forgot-password" fullWidth sx={primaryCtaSx}>
                        Get new reset link
                    </Button>
                    <Typography sx={{ textAlign: 'center' }}>
                        <MuiLink component={Link} href="/login" sx={{ fontWeight: 600, color: BRAND.accent }}>
                            Back to sign in
                        </MuiLink>
                    </Typography>
                </Stack>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title="Set new password"
            subtitle="Choose a strong password (at least 6 characters)."
            footer={
                <MuiLink component={Link} href="/login" sx={{ fontWeight: 600, color: BRAND.accent }}>
                    Back to sign in
                </MuiLink>
            }
        >
            <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2.5}>
                    {error && <AuthFormError>{error}</AuthFormError>}
                    <Box>
                        <TextField
                            label="New password"
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError(null);
                            }}
                            placeholder="••••••••"
                            required
                            fullWidth
                            autoFocus
                            sx={authTextFieldSx}
                            slotProps={{ htmlInput: { minLength: 6, autoComplete: 'new-password' } }}
                        />
                        <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: BRAND.textSubtle }}>
                            At least 6 characters
                        </Typography>
                    </Box>
                    <TextField
                        label="Confirm password"
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setError(null);
                        }}
                        placeholder="••••••••"
                        required
                        fullWidth
                        sx={authTextFieldSx}
                        slotProps={{ htmlInput: { minLength: 6, autoComplete: 'new-password' } }}
                    />
                    <Button type="submit" variant="contained" disabled={isLoading} fullWidth sx={primaryCtaSx}>
                        {isLoading ? <CircularProgress size={24} sx={{ color: BRAND.accentContrast }} /> : 'Reset password'}
                    </Button>
                </Stack>
            </Box>
        </AuthShell>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: BRAND.bg }}>
                    <CircularProgress sx={{ color: BRAND.accent }} />
                </Box>
            }
        >
            <ResetPasswordContent />
        </Suspense>
    );
}
