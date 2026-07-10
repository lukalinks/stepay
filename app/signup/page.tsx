'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';
import { AuthFormError } from '@/components/auth/AuthAlert';
import { AuthPasswordField } from '@/components/auth/AuthPasswordField';
import { AuthShell } from '@/components/auth/AuthShell';
import { createLocalWallet } from '@/components/wallet/WalletProvider';
import { removeLocalWallet, clearAccountLocalState, exportVaultForBackup } from '@/lib/client-wallet';
import { setExpectedUserId } from '@/lib/client-account-sync';
import { confirmDeliveryHint } from '@/lib/confirm-ui';
import { accentLinkSx, authTextFieldSx, authSelectMenuProps, BRAND, primaryCtaSx } from '@/lib/brand';
import { MIN_PASSWORD_LENGTH, validatePassword } from '@/lib/password-policy';
import { listMarkets } from '@/lib/markets';
import { isChunkLoadError, reloadOnceForChunkError } from '@/lib/chunk-recovery';
import { useRouter, useSearchParams } from 'next/navigation';

type SignupStep = 'form' | 'verify';

function toFriendlyAuthError(msg?: string): string {
    if (!msg) return 'Something went wrong. Please try again.';
    const m = msg.toLowerCase();
    if (m.includes('already') || (m.includes('email') && m.includes('exists'))) return 'An account with this email already exists. Try signing in instead.';
    if (m.includes('invalid') && m.includes('email')) return 'Please enter a valid email address.';
    if (m.includes('password') && (m.includes('short') || m.includes('weak') || m.includes('length'))) return `Your password should be at least ${MIN_PASSWORD_LENGTH} characters long.`;
    if (m.includes('too many') || m.includes('rate limit')) return 'Too many signup attempts. Please wait a few minutes and try again.';
    if (m.includes('incorrect') || m.includes('verification code')) return msg;
    if (m.includes('expired')) return msg;
    if (m.includes('wallet')) return msg ?? 'Invalid wallet details.';
    if (m.includes('failed to load chunk') || m.includes('loading chunk')) {
        return 'Stepay was just updated. Please refresh the page and try again.';
    }
    return msg;
}

function SignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('next') || '/dashboard';
    const [step, setStep] = useState<SignupStep>('form');
    const [email, setEmail] = useState(() => searchParams.get('email')?.trim() ?? '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [countryCode, setCountryCode] = useState('ZM');
    const [signupId, setSignupId] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [deliveryHint, setDeliveryHint] = useState<string | undefined>();
    const [devHint, setDevHint] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cloudBackupEnabled, setCloudBackupEnabled] = useState(true);

    const passwordsMatch = password === confirmPassword;
    const canSubmitForm = email.trim().includes('@') && password.length >= MIN_PASSWORD_LENGTH && passwordsMatch;
    const canVerify = otpCode.replace(/\D/g, '').length === 6;

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const trimmedEmail = email.trim();
        if (!trimmedEmail.includes('@')) {
            setError('Please enter a valid email address.');
            return;
        }
        const pwdErr = validatePassword(password);
        if (pwdErr) {
            setError(pwdErr);
            return;
        }
        if (!passwordsMatch) {
            setError('Your passwords don\'t match. Please type them again to make sure they\'re the same.');
            return;
        }

        clearAccountLocalState();

        setIsLoading(true);

        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });

            const res = await fetch('/api/auth/signup/intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: trimmedEmail, password, countryCode }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.success) {
                setSignupId(data.signupId);
                setDevHint(data.devConfirmCode);
                setDeliveryHint(confirmDeliveryHint(data));
                setOtpCode('');
                setStep('verify');
            } else {
                setError(toFriendlyAuthError(data.error));
            }
        } catch {
            setError('We couldn\'t reach our servers. Please check your internet connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!canVerify) {
            setError('Please enter the 6-digit code from your email.');
            return;
        }

        setIsLoading(true);

        try {
            clearAccountLocalState();
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });

            const { publicKey: walletPublic } = await createLocalWallet(password);
            const walletBackup = cloudBackupEnabled ? exportVaultForBackup() : null;
            if (cloudBackupEnabled && !walletBackup) {
                removeLocalWallet();
                setError('Could not secure your wallet backup. Please try again.');
                return;
            }

            const res = await fetch('/api/auth/signup/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    signupId,
                    code: otpCode,
                    walletPublic,
                    cloudBackupEnabled,
                    walletBackup,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                if (typeof data.userId === 'string') {
                    setExpectedUserId(data.userId);
                }
                const target = redirectTo.startsWith('/') ? redirectTo : '/dashboard';
                const sep = target.includes('?') ? '&' : '?';
                window.location.href = `${target}${sep}welcome=1&_=${Date.now()}`;
                return;
            } else {
                removeLocalWallet();
                setError(toFriendlyAuthError(data.error));
            }
        } catch (err) {
            removeLocalWallet();
            if (isChunkLoadError(err) && reloadOnceForChunkError()) {
                return;
            }
            setError(
                isChunkLoadError(err)
                    ? 'Stepay was just updated. Refresh the page and enter your code again.'
                    : err instanceof Error
                      ? err.message
                      : 'We couldn\'t reach our servers. Please check your internet connection and try again.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/signup/intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: email.trim(), password, countryCode }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success) {
                setSignupId(data.signupId);
                setDevHint(data.devConfirmCode);
                setDeliveryHint(confirmDeliveryHint(data));
                setOtpCode('');
            } else {
                setError(toFriendlyAuthError(data.error));
            }
        } catch {
            setError('Could not resend code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const loginHref = `/login${redirectTo !== '/dashboard' ? `?next=${encodeURIComponent(redirectTo)}` : ''}`;

    return (
        <AuthShell
            mode="signup"
            title={step === 'verify' ? 'Verify your email' : 'Create your wallet'}
            subtitle={
                step === 'verify'
                    ? deliveryHint || 'Enter the 6-digit code we sent to your email.'
                    : 'Your keys stay on this device. Back up your secret key anytime in Settings.'
            }
            footer={
                <>
                    Already have an account?{' '}
                    <MuiLink component={Link} href={loginHref} sx={accentLinkSx}>
                        Sign in
                    </MuiLink>
                </>
            }
        >
            {step === 'verify' ? (
                <Box component="form" onSubmit={handleVerify} noValidate>
                    <Stack spacing={2.5}>
                        {error && <AuthFormError>{error}</AuthFormError>}
                        {devHint && (
                            <Typography
                                sx={{
                                    fontSize: '0.75rem',
                                    color: BRAND.textSubtle,
                                    px: 1.5,
                                    py: 1.25,
                                    borderRadius: 2,
                                    border: '1px solid rgba(245, 158, 11, 0.25)',
                                    bgcolor: 'rgba(245, 158, 11, 0.08)',
                                }}
                            >
                                Dev: verification code is{' '}
                                <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 700, color: BRAND.accent }}>
                                    {devHint}
                                </Box>
                            </Typography>
                        )}
                        <TextField
                            label="Verification code"
                            id="signup-otp"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="••••••"
                            required
                            fullWidth
                            autoFocus
                            sx={{
                                ...authTextFieldSx,
                                '& input': { textAlign: 'center', letterSpacing: '0.3em', fontWeight: 700 },
                            }}
                            helperText="Code expires in 10 minutes"
                            slotProps={{
                                formHelperText: { sx: { color: BRAND.textSubtle, mx: 0, mt: 0.75 } },
                            }}
                        />
                        <Button type="submit" variant="contained" disabled={isLoading || !canVerify} fullWidth sx={primaryCtaSx}>
                            {isLoading ? <CircularProgress size={24} sx={{ color: BRAND.accentContrast }} /> : 'Verify & create account'}
                        </Button>
                        <Stack spacing={1} sx={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Button
                                type="button"
                                variant="text"
                                disabled={isLoading}
                                onClick={() => {
                                    setStep('form');
                                    setOtpCode('');
                                    setError(null);
                                }}
                                sx={{ color: BRAND.textSubtle, textTransform: 'none' }}
                            >
                                Back
                            </Button>
                            <Button
                                type="button"
                                variant="text"
                                disabled={isLoading}
                                onClick={handleResend}
                                sx={{ color: BRAND.accent, textTransform: 'none', fontWeight: 600 }}
                            >
                                Resend code
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            ) : (
                <Box component="form" onSubmit={handleSendCode} noValidate>
                    <Stack spacing={2.5}>
                        {error && <AuthFormError>{error}</AuthFormError>}
                        <TextField
                            select
                            label="Country"
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            required
                            fullWidth
                            sx={authTextFieldSx}
                            helperText="Local currency and payment options depend on your country"
                            slotProps={{
                                select: authSelectMenuProps,
                                formHelperText: { sx: { color: BRAND.textSubtle, mx: 0, mt: 0.75 } },
                            }}
                        >
                            {listMarkets().map((market) => (
                                <MenuItem key={market.countryCode} value={market.countryCode}>
                                    {market.countryName} ({market.currency})
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Email"
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                            onChange={setPassword}
                            autoComplete="new-password"
                            showStrength
                            helperText={`Encrypts your wallet on this device. At least ${MIN_PASSWORD_LENGTH} characters.`}
                        />
                        <AuthPasswordField
                            id="confirmPassword"
                            label="Confirm password"
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                            autoComplete="new-password"
                            showMatch
                            matchValue={password}
                        />
                        <Box
                            component="label"
                            sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 1.25,
                                cursor: 'pointer',
                                fontSize: '0.8125rem',
                                color: BRAND.textMuted,
                                lineHeight: 1.5,
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={cloudBackupEnabled}
                                onChange={(e) => setCloudBackupEnabled(e.target.checked)}
                                style={{ marginTop: 4 }}
                            />
                            <span>
                                <strong style={{ color: BRAND.accentLight }}>Save encrypted cloud backup</strong> (recommended) —
                                restore on a new phone with your password and email code. Uncheck for device-only maximum privacy.
                            </span>
                        </Box>
                        <Button type="submit" variant="contained" disabled={isLoading || !canSubmitForm} fullWidth sx={primaryCtaSx}>
                            {isLoading ? <CircularProgress size={24} sx={{ color: BRAND.accentContrast }} /> : 'Continue'}
                        </Button>
                    </Stack>
                </Box>
            )}
        </AuthShell>
    );
}

export default function SignupPage() {
    return (
        <Suspense
            fallback={
                <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: BRAND.bg }}>
                    <CircularProgress sx={{ color: BRAND.accentContrast }} />
                </Box>
            }
        >
            <SignupForm />
        </Suspense>
    );
}
