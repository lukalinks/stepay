'use client';

import { useState, Suspense, useEffect, useRef } from 'react';
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
import { BackButton } from '@/components/BackButton';
import { createLocalWallet } from '@/components/wallet/WalletProvider';
import { removeLocalWallet, clearAccountLocalState, exportVaultForBackup } from '@/lib/client-wallet';
import { setExpectedUserId } from '@/lib/client-account-sync';
import { confirmDeliveryHint } from '@/lib/confirm-ui';
import { accentLinkSx, authTextFieldSx, authSelectMenuProps, BRAND, primaryCtaSx } from '@/lib/brand';
import { MIN_PASSWORD_LENGTH, validatePassword } from '@/lib/password-policy';
import { formatMarketLabel, listSelectableMarkets, getMarket } from '@/lib/markets';
import { isChunkLoadError, reloadOnceForChunkError } from '@/lib/chunk-recovery';
import { safeInternalPath } from '@/lib/safe-redirect';
import { useSearchParams } from 'next/navigation';

type SignupStep = 'form' | 'verify' | 'waitlist' | 'waitlist_done';

function toFriendlyAuthError(msg?: string): string {
    if (!msg) return 'Something went wrong. Please try again.';
    const m = msg.toLowerCase();
    if (m.includes('already') || (m.includes('email') && m.includes('exists'))) return 'An account with this email already exists. Try signing in instead.';
    if (m.includes('invalid') && m.includes('email')) return 'Please enter a valid email address.';
    if (m.includes('password') && (m.includes('short') || m.includes('weak') || m.includes('length'))) return `Your password should be at least ${MIN_PASSWORD_LENGTH} characters long.`;
    if (m.includes('too many') || m.includes('rate limit')) return 'Too many signup attempts. Please wait a few minutes and try again.';
    if (m.includes('incorrect') || m.includes('verification code')) return msg;
    if (m.includes('expired')) return msg;
    if (m.includes('closed beta') || m.includes('not publicly') || m.includes('waitlist')) return msg;
    if (m.includes('terms') || m.includes('privacy policy')) return msg;
    if (m.includes('wallet')) return msg ?? 'Invalid wallet details.';
    if (m.includes('failed to load chunk') || m.includes('loading chunk')) {
        return 'Stepay was just updated. Please refresh the page and try again.';
    }
    return msg;
}

function SignupForm() {
    const searchParams = useSearchParams();
    const redirectTo = safeInternalPath(searchParams.get('next'), '/dashboard');
    const inviteToken = searchParams.get('invite')?.trim() || '';
    const [step, setStep] = useState<SignupStep>('form');
    const [accessLoading, setAccessLoading] = useState(true);
    const [inviteRequired, setInviteRequired] = useState(false);
    const [inviteValid, setInviteValid] = useState(false);
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
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [waitlistMessage, setWaitlistMessage] = useState<string | null>(null);
    const verifyLockRef = useRef(false);
    const pendingWalletPublicRef = useRef<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setAccessLoading(true);
        const qs = inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : '';
        fetch(`/api/access${qs}`)
            .then(async (res) => {
                const data = await res.json().catch(() => null);
                return { ok: res.ok, data };
            })
            .then(({ ok, data }) => {
                if (cancelled) return;
                if (!ok || !data) {
                    // Fail closed — show waitlist / invite path until access is readable.
                    setInviteRequired(true);
                    setInviteValid(false);
                    setStep('waitlist');
                    setError('Could not check signup access. Join the waitlist or try again shortly.');
                    return;
                }
                const required = Boolean(data.inviteRequired);
                const valid = Boolean(data.inviteValid);
                setInviteRequired(required);
                setInviteValid(valid);
                if (typeof data.inviteEmail === 'string' && data.inviteEmail.includes('@')) {
                    setEmail(data.inviteEmail);
                }
                // Closed beta: prefer create-account when invite link is missing/outdated.
                // Waitlist-first trapped invited users after invite links were resent (token rotated).
                if (required && !valid) {
                    if (inviteToken) {
                        setStep('form');
                        setError(
                            'This invite link is outdated. Enter the email you were invited with to create your account, or open the newest invite email.'
                        );
                    } else {
                        setStep('form');
                    }
                }
            })
            .catch(() => {
                if (cancelled) return;
                setInviteRequired(true);
                setInviteValid(false);
                setStep('waitlist');
                setError('Could not check signup access. Join the waitlist or try again shortly.');
            })
            .finally(() => {
                if (!cancelled) setAccessLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [inviteToken]);

    const passwordsMatch = password === confirmPassword;
    const canSubmitForm =
        email.trim().includes('@') &&
        password.length >= MIN_PASSWORD_LENGTH &&
        passwordsMatch &&
        acceptedTerms;
    const canVerify = otpCode.replace(/\D/g, '').length === 6;
    const canJoinWaitlist = email.trim().includes('@');

    const handleWaitlist = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const trimmedEmail = email.trim();
        if (!trimmedEmail.includes('@')) {
            setError('Please enter a valid email address.');
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: trimmedEmail }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success) {
                if (data.pendingInvite) {
                    setWaitlistMessage(data.message || null);
                    setInviteRequired(true);
                    setStep('form');
                    setError(
                        data.message ||
                            'This email already has an invite. Continue below with that email to create your account.'
                    );
                    return;
                }
                setWaitlistMessage(
                    data.message ||
                        "Stepay is not publicly launched yet. You're on the list — we'll email you when it's available."
                );
                setStep('waitlist_done');
            } else if (data.publicLaunch) {
                setInviteRequired(false);
                setStep('form');
                setError(null);
            } else {
                setError(toFriendlyAuthError(data.error));
            }
        } catch {
            setError("We couldn't reach our servers. Please check your internet connection and try again.");
        } finally {
            setIsLoading(false);
        }
    };

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
            setError("Your passwords don't match. Please type them again to make sure they're the same.");
            return;
        }
        if (!acceptedTerms) {
            setError('Please accept the Terms of Service and Privacy Policy to continue.');
            return;
        }

        clearAccountLocalState();
        pendingWalletPublicRef.current = null;

        setIsLoading(true);

        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });

            const res = await fetch('/api/auth/signup/intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: trimmedEmail,
                    password,
                    countryCode,
                    inviteToken: inviteToken || undefined,
                    acceptedTerms: true,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.success) {
                setSignupId(data.signupId);
                setDevHint(data.devConfirmCode);
                setDeliveryHint(confirmDeliveryHint(data));
                setOtpCode('');
                setStep('verify');
            } else if (data.waitlist) {
                setInviteRequired(true);
                setInviteValid(false);
                setStep('waitlist');
                setError(null);
            } else {
                setError(toFriendlyAuthError(data.error));
            }
        } catch {
            setError("We couldn't reach our servers. Please check your internet connection and try again.");
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
        if (verifyLockRef.current || isLoading) return;
        verifyLockRef.current = true;

        setIsLoading(true);

        try {
            // Clear cookies only — do not wipe a vault already created for this OTP attempt.
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });

            let walletPublic = pendingWalletPublicRef.current;
            if (!walletPublic) {
                const created = await createLocalWallet(password);
                walletPublic = created.publicKey;
                pendingWalletPublicRef.current = walletPublic;
            }

            const walletBackup = cloudBackupEnabled ? exportVaultForBackup() : null;
            if (cloudBackupEnabled && !walletBackup) {
                removeLocalWallet();
                pendingWalletPublicRef.current = null;
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
                    inviteToken: inviteToken || undefined,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                if (typeof data.userId === 'string') {
                    setExpectedUserId(data.userId);
                }
                const target = safeInternalPath(redirectTo, '/dashboard');
                const sep = target.includes('?') ? '&' : '?';
                window.location.assign(`${target}${sep}welcome=1`);
                return;
            }

            const errMsg = typeof data.error === 'string' ? data.error : '';
            const fatal =
                /expired|too many|not found|start signup|already exists|already linked|closed beta|waitlist/i.test(
                    errMsg
                );
            if (fatal) {
                removeLocalWallet();
                pendingWalletPublicRef.current = null;
            }
            setError(toFriendlyAuthError(errMsg));
        } catch (err) {
            // Keep vault on network blips — server may have already created the account.
            if (isChunkLoadError(err) && reloadOnceForChunkError()) {
                return;
            }
            setError(
                isChunkLoadError(err)
                    ? 'Stepay was just updated. Refresh the page and enter your code again.'
                    : err instanceof Error
                      ? err.message
                      : "We couldn't reach our servers. Please check your internet connection and try again."
            );
        } finally {
            verifyLockRef.current = false;
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
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                    countryCode,
                    inviteToken: inviteToken || undefined,
                    acceptedTerms: true,
                }),
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

    if (accessLoading) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: BRAND.bg }}>
                <CircularProgress sx={{ color: BRAND.accentContrast }} />
            </Box>
        );
    }

    const shellTitle =
        step === 'verify'
            ? 'Verify your email'
            : step === 'waitlist' || step === 'waitlist_done'
              ? 'Closed beta'
              : inviteRequired && inviteValid
                ? 'Accept your invite'
                : 'Create your wallet';

    const shellSubtitle =
        step === 'verify'
            ? deliveryHint || 'Enter the 6-digit code we sent to your email.'
            : step === 'waitlist'
              ? 'Stepay is not publicly launched yet. Leave your email and we will notify you when it is available.'
              : step === 'waitlist_done'
                ? 'Thanks for your interest.'
                : inviteRequired && inviteValid
                  ? 'You have an invite to the Stepay closed beta. Create your wallet to continue.'
                  : 'Your keys stay on this device. Back up your secret key anytime in Settings.';

    return (
        <AuthShell
            mode="signup"
            title={shellTitle}
            subtitle={shellSubtitle}
            footer={
                <>
                    Already have an account?{' '}
                    <MuiLink component={Link} href={loginHref} sx={accentLinkSx}>
                        Sign in
                    </MuiLink>
                </>
            }
        >
            {step === 'waitlist_done' ? (
                <Stack spacing={2.5}>
                    <Typography sx={{ color: BRAND.textMuted, fontSize: '0.9375rem', lineHeight: 1.6 }}>
                        {waitlistMessage ||
                            "Stepay is not publicly launched yet. You're on the list — we'll email you when it's available."}
                    </Typography>
                    <Button component={Link} href={loginHref} variant="contained" fullWidth sx={primaryCtaSx}>
                        Back to sign in
                    </Button>
                </Stack>
            ) : step === 'waitlist' ? (
                <Box component="form" onSubmit={handleWaitlist} noValidate>
                    <Stack spacing={2.5}>
                        {error && <AuthFormError>{error}</AuthFormError>}
                        <Typography sx={{ color: BRAND.textMuted, fontSize: '0.875rem', lineHeight: 1.55 }}>
                            The platform is in closed beta. Open your invite email link, or enter the invited email on the
                            create-account form. Otherwise join the waitlist below.
                        </Typography>
                        <TextField
                            label="Email"
                            id="waitlist-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            fullWidth
                            autoFocus
                            sx={authTextFieldSx}
                            slotProps={{ htmlInput: { inputMode: 'email', autoComplete: 'email' } }}
                        />
                        <Button type="submit" variant="contained" disabled={isLoading || !canJoinWaitlist} fullWidth sx={primaryCtaSx}>
                            {isLoading ? <CircularProgress size={24} sx={{ color: BRAND.accentContrast }} /> : 'Notify me when available'}
                        </Button>
                        <Button
                            type="button"
                            variant="text"
                            fullWidth
                            onClick={() => {
                                setError(null);
                                setStep('form');
                            }}
                            sx={{ color: BRAND.accent, textTransform: 'none' }}
                        >
                            I was invited — create account
                        </Button>
                    </Stack>
                </Box>
            ) : step === 'verify' ? (
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
                            helperText="Code expires in 30 minutes"
                            slotProps={{
                                formHelperText: { sx: { color: BRAND.textSubtle, mx: 0, mt: 0.75 } },
                            }}
                        />
                        <Button type="submit" variant="contained" disabled={isLoading || !canVerify} fullWidth sx={primaryCtaSx}>
                            {isLoading ? <CircularProgress size={24} sx={{ color: BRAND.accentContrast }} /> : 'Verify & create account'}
                        </Button>
                        <Stack spacing={1} sx={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <BackButton
                                label="Back"
                                variant="dark"
                                disabled={isLoading}
                                onClick={() => {
                                    setStep('form');
                                    setOtpCode('');
                                    setError(null);
                                }}
                            />
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
                        {inviteRequired && inviteValid && (
                            <Typography sx={{ color: BRAND.textMuted, fontSize: '0.8125rem' }}>
                                Invited closed-beta access for this email.
                            </Typography>
                        )}
                        {inviteRequired && !inviteValid && (
                            <Typography sx={{ color: BRAND.textMuted, fontSize: '0.8125rem', lineHeight: 1.55 }}>
                                Closed beta: use the exact email that received your invite. No invite yet?{' '}
                                <Box
                                    component="button"
                                    type="button"
                                    onClick={() => {
                                        setError(null);
                                        setStep('waitlist');
                                    }}
                                    sx={{
                                        border: 0,
                                        background: 'none',
                                        p: 0,
                                        color: BRAND.accent,
                                        font: 'inherit',
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                    }}
                                >
                                    Join the waitlist
                                </Box>
                                .
                            </Typography>
                        )}
                        <TextField
                            select
                            label="Country"
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            required
                            fullWidth
                            sx={authTextFieldSx}
                            helperText={undefined}
                            slotProps={{
                                select: {
                                    ...authSelectMenuProps,
                                    renderValue: (value) => formatMarketLabel(getMarket(String(value))),
                                },
                                formHelperText: { sx: { color: BRAND.textSubtle, mx: 0, mt: 0.75 } },
                            }}
                        >
                            {listSelectableMarkets().map((market) => (
                                <MenuItem key={market.countryCode} value={market.countryCode}>
                                    {formatMarketLabel(market)}
                                    {market.comingSoon ? ' · Soon' : ''}
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
                            disabled={inviteRequired && inviteValid}
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
                            helperText={`Encrypts your wallet on this device. Minimum ${MIN_PASSWORD_LENGTH} characters — longer and mixed is stronger.`}
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
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                required
                                style={{ marginTop: 4 }}
                            />
                            <span>
                                I accept the{' '}
                                <MuiLink
                                    component={Link}
                                    href="/terms"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    sx={{ ...accentLinkSx, fontSize: 'inherit' }}
                                >
                                    Terms of Service
                                </MuiLink>{' '}
                                and{' '}
                                <MuiLink
                                    component={Link}
                                    href="/privacy"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    sx={{ ...accentLinkSx, fontSize: 'inherit' }}
                                >
                                    Privacy Policy
                                </MuiLink>
                                {inviteRequired && inviteValid ? ' to join the closed beta.' : '.'}
                            </span>
                        </Box>
                        <Button type="submit" variant="contained" disabled={isLoading || !canSubmitForm} fullWidth sx={primaryCtaSx}>
                            {isLoading ? (
                                <CircularProgress size={24} sx={{ color: BRAND.accentContrast }} />
                            ) : inviteRequired && inviteValid ? (
                                'Accept invite & continue'
                            ) : (
                                'Continue'
                            )}
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
