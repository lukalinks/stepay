'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AuthFormError } from '@/components/auth/AuthAlert';
import { AuthShell } from '@/components/auth/AuthShell';
import { authTextFieldSx, BRAND, primaryCtaSx } from '@/lib/brand';
import { confirmDeliveryHint } from '@/lib/confirm-ui';
import { adminLoginEmail } from '@/lib/hosts';
import { useRouter } from 'next/navigation';

type AdminLoginStep = 'request' | 'verify';

function toFriendlyError(msg?: string): string {
    if (!msg) return 'Something went wrong. Please try again.';
    const m = msg.toLowerCase();
    if (m.includes('incorrect') || m.includes('verification code')) return msg;
    if (m.includes('expired') || m.includes('too many')) return msg;
    if (m.includes('rate limit') || m.includes('too many attempts')) return 'Too many attempts. Please wait a few minutes and try again.';
    return msg;
}

export function AdminLoginForm({ redirectTo = '/admin' }: { redirectTo?: string }) {
    const router = useRouter();
    const email = adminLoginEmail();
    const [step, setStep] = useState<AdminLoginStep>('request');
    const [loginId, setLoginId] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [deliveryHint, setDeliveryHint] = useState<string | undefined>();
    const [devHint, setDevHint] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canVerify = otpCode.replace(/\D/g, '').length === 6;

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/admin/login/intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success) {
                setLoginId(data.loginId);
                setDevHint(data.devConfirmCode);
                setDeliveryHint(confirmDeliveryHint(data));
                setOtpCode('');
                setStep('verify');
            } else {
                setError(toFriendlyError(data.error));
            }
        } catch {
            setError('We couldn\'t reach our servers. Please check your connection and try again.');
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
            const res = await fetch('/api/auth/admin/login/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loginId, code: otpCode }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                const target = redirectTo.startsWith('/') ? redirectTo : '/admin';
                router.refresh();
                router.push(target);
            } else {
                setError(toFriendlyError(data.error));
            }
        } catch {
            setError('We couldn\'t reach our servers. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/admin/login/intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success) {
                setLoginId(data.loginId);
                setDevHint(data.devConfirmCode);
                setDeliveryHint(confirmDeliveryHint(data));
                setOtpCode('');
            } else {
                setError(toFriendlyError(data.error));
            }
        } catch {
            setError('Could not resend code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthShell
            title={step === 'verify' ? 'Enter verification code' : 'Admin login'}
            subtitle={
                step === 'verify'
                    ? deliveryHint || 'Enter the 6-digit code sent to your admin email.'
                    : 'We\'ll email a one-time code to the admin account.'
            }
        >
            {step === 'request' ? (
                <Box component="form" onSubmit={handleSendCode} noValidate>
                    <Stack spacing={2.25}>
                        <TextField
                            label="Admin email"
                            type="email"
                            value={email}
                            disabled
                            fullWidth
                            sx={authTextFieldSx}
                        />
                        <AuthFormError>{error}</AuthFormError>
                        <Button type="submit" variant="contained" disabled={isLoading} fullWidth sx={{ ...primaryCtaSx, mt: 0.5 }}>
                            {isLoading ? <CircularProgress size={24} sx={{ color: BRAND.accentContrast }} /> : 'Send login code'}
                        </Button>
                    </Stack>
                </Box>
            ) : (
                <Box component="form" onSubmit={handleVerify} noValidate>
                    <Stack spacing={2.25}>
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
                            slotProps={{ formHelperText: { sx: { color: BRAND.textSubtle, mx: 0, mt: 0.75 } } }}
                        />
                        <AuthFormError>{error}</AuthFormError>
                        <Button type="submit" variant="contained" disabled={isLoading || !canVerify} fullWidth sx={primaryCtaSx}>
                            {isLoading ? <CircularProgress size={24} sx={{ color: BRAND.accentContrast }} /> : 'Continue'}
                        </Button>
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                            <Button
                                type="button"
                                variant="text"
                                disabled={isLoading}
                                onClick={() => {
                                    setStep('request');
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
            )}
        </AuthShell>
    );
}

export function isAdminLoginHostClient(): boolean {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname.toLowerCase();
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/$/, '');
    if (adminUrl) {
        try {
            return host === new URL(adminUrl).hostname.toLowerCase();
        } catch {
            // fall through
        }
    }
    return host === 'admin.stepay.pro' || host === 'www.admin.stepay.pro';
}
