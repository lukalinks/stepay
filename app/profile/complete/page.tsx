'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import MuiLink from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { AuthShell } from '@/components/auth/AuthShell';
import { accentLinkSx, authTextFieldSx, BRAND, primaryCtaSx } from '@/lib/brand';
import { getMarket, listMarkets } from '@/lib/markets';
import { localPhoneDisplayForMarket } from '@/lib/phone';
import { useRouter, useSearchParams } from 'next/navigation';

const sectionLabelSx = {
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: BRAND.textSubtle,
    pb: 1,
    borderBottom: `1px solid ${BRAND.border}`,
};

function ProfileCompleteForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextPath = searchParams.get('next') || '/dashboard';
    const [fullName, setFullName] = useState('');
    const [countryCode, setCountryCode] = useState('ZM');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [idDocumentType, setIdDocumentType] = useState('nrc');
    const [idDocumentNumber, setIdDocumentNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/user/profile')
            .then((res) => {
                if (res.status === 401) {
                    const returnTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/profile/complete';
                    router.replace(`/login?next=${encodeURIComponent(returnTo)}`);
                    return null;
                }
                return res.json();
            })
            .then((data) => {
                if (!data) return;
                if (data.isProfileComplete) {
                    const target = nextPath.startsWith('/') ? nextPath : '/dashboard';
                    router.replace(target);
                    return;
                }
                setFullName(data.fullName || '');
                const resolvedCountry = data.countryCode || 'ZM';
                setCountryCode(resolvedCountry);
                const phoneRaw = data.phone || '';
                setPhone(localPhoneDisplayForMarket(phoneRaw, resolvedCountry));
                setAddress(data.address || '');
                const market = getMarket(resolvedCountry);
                const validId = market.idDocumentTypes.some((t) => t.id === data.idDocumentType)
                    ? data.idDocumentType
                    : market.idDocumentTypes[0]?.id ?? 'nrc';
                setIdDocumentType(validId);
                setIdDocumentNumber(data.idDocumentNumber || '');
            })
            .catch(() => router.replace('/login'))
            .finally(() => setIsChecking(false));
    }, [router, nextPath]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const market = getMarket(countryCode);
        const phoneDigits = phone.replace(/\s+/g, '').replace(/\D/g, '');
        if (phoneDigits.length < 9) {
            setError(`Please enter a valid mobile money number for ${market.countryName}.`);
            return;
        }
        const fullPhone = `${market.phoneDialCode}${phoneDigits.replace(/^0/, '')}`;
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: fullName.trim(),
                    countryCode,
                    phone: fullPhone,
                    address: address.trim(),
                    idDocumentType,
                    idDocumentNumber: idDocumentNumber.trim(),
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.success !== false) {
                const target = nextPath.startsWith('/') ? nextPath : '/dashboard';
                router.push(target);
            } else {
                setError(data.error || 'Failed to save. Please try again.');
            }
        } catch (err) {
            console.error(err);
            setError("We couldn't reach our servers. Please check your connection and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isChecking) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: BRAND.bg }}>
                <CircularProgress sx={{ color: BRAND.accent }} />
            </Box>
        );
    }

    const skipHref = nextPath.startsWith('/') ? nextPath : '/dashboard';
    const market = getMarket(countryCode);
    const selectedIdType = market.idDocumentTypes.find((t) => t.id === idDocumentType) ?? market.idDocumentTypes[0];

    return (
        <AuthShell
            title="Complete your profile"
            subtitle="We need a few details before you can deposit, swap, or cash out."
            footer={
                <>
                    Prefer to skip for now?{' '}
                    <MuiLink component={Link} href={skipHref} sx={accentLinkSx}>
                        Continue without saving
                    </MuiLink>
                </>
            }
        >
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <Stack spacing={3.5}>
                    {error && (
                        <AuthAlert variant="warning" title="Something went wrong">
                            {error}
                        </AuthAlert>
                    )}

                    <Stack spacing={2}>
                        <Typography sx={sectionLabelSx}>Personal details</Typography>
                        <TextField
                            select
                            label="Country"
                            value={countryCode}
                            onChange={(e) => {
                                setCountryCode(e.target.value);
                                const nextMarket = getMarket(e.target.value);
                                if (!nextMarket.idDocumentTypes.some((t) => t.id === idDocumentType)) {
                                    setIdDocumentType(nextMarket.idDocumentTypes[0]?.id ?? 'nrc');
                                }
                            }}
                            required
                            fullWidth
                            sx={authTextFieldSx}
                            helperText={`Payments in ${market.currency} · ${market.paymentMethods.includes('mobile_money') ? 'Mobile money only' : 'See available methods at checkout'}`}
                            slotProps={{ formHelperText: { sx: { color: BRAND.textSubtle, mx: 0, mt: 0.75 } } }}
                        >
                            {listMarkets().map((m) => (
                                <MenuItem key={m.countryCode} value={m.countryCode}>
                                    {m.countryName} ({m.currency})
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Full name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="John Mwale"
                            required
                            fullWidth
                            sx={authTextFieldSx}
                            slotProps={{ htmlInput: { minLength: 2, maxLength: 100 } }}
                        />
                        <TextField
                            label="Phone number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="97 123 4567"
                            required
                            fullWidth
                            sx={authTextFieldSx}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <Typography component="span" sx={{ color: BRAND.textMuted, mr: 1, fontWeight: 600, fontSize: '0.9375rem' }}>
                                            {market.phoneDialCode}
                                        </Typography>
                                    ),
                                },
                                htmlInput: { inputMode: 'tel' },
                                formHelperText: { sx: { color: BRAND.textSubtle, mx: 0, mt: 0.75 } },
                            }}
                            helperText={
                                market.paymentMethods.includes('mobile_money')
                                    ? 'Mobile money number for deposits and payouts'
                                    : 'Phone number for account verification'
                            }
                        />
                        <TextField
                            label="Address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="House number, street, town, province"
                            required
                            fullWidth
                            multiline
                            rows={3}
                            sx={authTextFieldSx}
                            slotProps={{ htmlInput: { minLength: 10, maxLength: 500 } }}
                        />
                    </Stack>

                    <Stack spacing={2}>
                        <Typography sx={sectionLabelSx}>ID verification</Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                select
                                label="ID type"
                                value={idDocumentType}
                                onChange={(e) => setIdDocumentType(e.target.value)}
                                required
                                fullWidth
                                sx={authTextFieldSx}
                            >
                                {market.idDocumentTypes.map((type) => (
                                    <MenuItem key={type.id} value={type.id}>
                                        {type.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                label={`${selectedIdType?.label ?? 'ID'} number`}
                                value={idDocumentNumber}
                                onChange={(e) => setIdDocumentNumber(e.target.value)}
                                placeholder={idDocumentType === 'nrc' ? '123456/78/9' : 'AB123456'}
                                required
                                fullWidth
                                sx={authTextFieldSx}
                                slotProps={{ htmlInput: { minLength: 5 } }}
                            />
                        </Stack>
                    </Stack>

                    <Button type="submit" variant="contained" disabled={isLoading} fullWidth sx={primaryCtaSx}>
                        {isLoading ? <CircularProgress size={24} sx={{ color: BRAND.bg }} /> : 'Save and continue'}
                    </Button>
                </Stack>
            </Box>
        </AuthShell>
    );
}

export default function ProfileCompletePage() {
    return (
        <Suspense
            fallback={
                <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: BRAND.bg }}>
                    <CircularProgress sx={{ color: BRAND.accent }} />
                </Box>
            }
        >
            <ProfileCompleteForm />
        </Suspense>
    );
}
