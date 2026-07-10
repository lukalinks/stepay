'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { alpha } from '@mui/material/styles';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';

export function AuthNav() {
    const [status, setStatus] = useState<'loading' | 'in' | 'out'>('loading');

    useEffect(() => {
        fetch('/api/user', { credentials: 'include' })
            .then((res) => setStatus(res.ok ? 'in' : 'out'))
            .catch(() => setStatus('out'));
    }, []);

    if (status === 'loading') {
        return <CircularProgress size={22} color="primary" />;
    }

    if (status === 'in') {
        return (
            <Button component={Link} href="/dashboard" variant="contained" color="primary" size="medium">
                Open dashboard
            </Button>
        );
    }

    return (
        <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} sx={{ alignItems: 'center' }}>
            <Button
                component={Link}
                href="/login"
                variant="text"
                color="inherit"
                sx={{ fontWeight: 500, color: 'text.secondary', minHeight: 44, '&:hover': { bgcolor: alpha('#0d9488', 0.06) } }}
            >
                Login
            </Button>
            <Button
                component={Link}
                href="/signup?next=/dashboard"
                variant="contained"
                sx={{
                    bgcolor: 'grey.900',
                    color: 'common.white',
                    fontWeight: 600,
                    px: { xs: 2, sm: 2.5 },
                    minHeight: 44,
                    boxShadow: `0 4px 14px ${alpha('#000', 0.12)}`,
                    '&:hover': { bgcolor: 'grey.800', boxShadow: `0 8px 22px ${alpha('#000', 0.18)}` },
                }}
            >
                Sign up
            </Button>
        </Stack>
    );
}
