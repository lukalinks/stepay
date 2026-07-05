'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

export function DashboardWelcomeToast({ displayName }: { displayName: string }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (searchParams.get('welcome') !== '1') return;
        setOpen(true);
        const path = window.location.pathname;
        router.replace(path, { scroll: false });
    }, [searchParams, router]);

    return (
        <Snackbar
            open={open}
            autoHideDuration={5000}
            onClose={() => setOpen(false)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            sx={{ mt: { xs: 7, md: 2 } }}
        >
            <Alert
                onClose={() => setOpen(false)}
                severity="success"
                variant="filled"
                sx={{
                    width: '100%',
                    borderRadius: 2.5,
                    fontWeight: 600,
                    bgcolor: '#0a0a0a',
                    color: '#fff',
                    border: '1px solid rgba(201, 169, 98, 0.35)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                    '& .MuiAlert-icon': { color: 'var(--brand-accent)' },
                }}
            >
                You&apos;re in, {displayName}! Your wallet is ready — back up your secret key anytime in Settings.
            </Alert>
        </Snackbar>
    );
}
