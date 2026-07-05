'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MuiLink from '@mui/material/Link';
import { AdminLoginForm, isAdminLoginHostClient } from '@/components/auth/AdminLoginForm';
import { AuthFormError, AuthSuccessBanner } from '@/components/auth/AuthAlert';
import { AuthPasswordField } from '@/components/auth/AuthPasswordField';
import { AuthShell } from '@/components/auth/AuthShell';
import { accentLinkSx, authTextFieldSx, BRAND, primaryCtaSx } from '@/lib/brand';
import { hasLocalWallet, removeLocalWallet, setWalletUnlockHint, unlockLocalWallet } from '@/lib/client-wallet';
import { syncClientAccountSession } from '@/lib/client-account-sync';
import { useRouter, useSearchParams } from 'next/navigation';

function toFriendlyAuthError(msg?: string, action: string = 'sign in'): string {
    if (!msg) return `We couldn't ${action}. Please try again.`;
    const m = msg.toLowerCase();
    if (m.includes('invalid') && (m.includes('credentials') || m.includes('email') || m.includes('password'))) return 'Invalid email or password. Please check and try again.';
    if (m.includes('user not found') || m.includes('email not found')) return 'We don\'t have an account with that email. Try signing up first.';
    if (m.includes('unauthorized')) return 'Your session may have expired. Please sign in again.';
    if (m.includes('too many') || m.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.';
    if (m.includes('network') || m.includes('connection')) return 'We couldn\'t reach our servers. Please check your connection.';
    if (m.includes('database') || m.includes('database_url')) {
        return 'Sign-in is not connected to the database yet. Set DATABASE_URL in .env and restart the dev server.';
    }
    return msg;
}

function UserLoginForm({
    redirectTo,
    errorParam,
    messageParam,
    initialEmail,
}: {
    redirectTo: string;
    errorParam: string | null;
    messageParam: string | null;
    initialEmail: string;
}) {
    const router = useRouter();
    const [email, setEmail] = useState(initialEmail);
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
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                if (typeof data.userId === 'string') {
                    syncClientAccountSession(data.userId);
                }
                if (hasLocalWallet()) {
                    try {
                        await unlockLocalWallet(password);
                    } catch {
                        // Wrong password for the vault on this device (often a prior account) — drop vault only.
                        removeLocalWallet();
                        setWalletUnlockHint(
                            'Sign-in succeeded. Enter your account password below to unlock your wallet. If you created this account on another device, import your secret key from Settings.'
                        );
                    }
                }
                const target = redirectTo.startsWith('/') ? redirectTo : '/dashboard';
                window.location.href = target;
                return;
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

    const signupQs = new URLSearchParams();
    if (redirectTo !== '/dashboard') signupQs.set('next', redirectTo);
    if (email.trim()) signupQs.set('email', email.trim());
    const signupHref = `/signup${signupQs.toString() ? `?${signupQs}` : ''}`;
    const canSubmit = email.trim().includes('@') && password.length >= 6;

    return (
        <AuthShell
            mode="login"
            title="Welcome back"
            subtitle="Sign in to your dollar wallet. Pay by phone, deposit from mobile money, and cash out anytime."
            footer={
                <>
                    Don&apos;t have an account?{' '}
                    <MuiLink component={Link} href={signupHref} sx={accentLinkSx}>
                        Sign up free
                    </MuiLink>
                </>
            }
        >
            <Box component="form" onSubmit={handleLogin} noValidate>
                <Stack spacing={2.25}>
                    {messageParam === 'password-reset' && (
                        <AuthSuccessBanner>Password reset successful. Sign in with your new password.</AuthSuccessBanner>
                    )}

                    <TextField
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setError(null);
                        }}
                        placeholder="you@example.com"
                        required
                        fullWidth
                        autoFocus={!email}
                        sx={authTextFieldSx}
                        slotProps={{ htmlInput: { inputMode: 'email', autoComplete: 'email' } }}
                    />

                    <AuthPasswordField
                        id="password"
                        label="Password"
                        value={password}
                        onChange={(v) => {
                            setPassword(v);
                            setError(null);
                        }}
                        autoComplete="current-password"
                        headerRight={
                            <MuiLink
                                component={Link}
                                href="/forgot-password"
                                sx={{ ...accentLinkSx, fontSize: '0.8125rem', fontWeight: 600 }}
                            >
                                Forgot password?
                            </MuiLink>
                        }
                    />

                    <AuthFormError>{error}</AuthFormError>

                    <Button type="submit" variant="contained" disabled={isLoading || !canSubmit} fullWidth sx={{ ...primaryCtaSx, mt: 0.5 }}>
                        {isLoading ? <CircularProgress size={24} sx={{ color: BRAND.accentContrast }} /> : 'Sign in'}
                    </Button>
                </Stack>
            </Box>
        </AuthShell>
    );
}

function LoginForm() {
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('next') || '/dashboard';
    const errorParam = searchParams.get('error');
    const messageParam = searchParams.get('message');
    const initialEmail = searchParams.get('email')?.trim() ?? '';
    const [isAdminHost] = useState(() => isAdminLoginHostClient());

    if (isAdminHost) {
        return <AdminLoginForm redirectTo={redirectTo.startsWith('/') ? redirectTo : '/admin'} />;
    }

    return (
        <UserLoginForm
            redirectTo={redirectTo}
            errorParam={errorParam}
            messageParam={messageParam}
            initialEmail={initialEmail}
        />
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: BRAND.bg }}>
                    <CircularProgress sx={{ color: BRAND.accentContrast }} />
                </Box>
            }
        >
            <LoginForm />
        </Suspense>
    );
}
