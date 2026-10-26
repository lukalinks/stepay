'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { alpha, keyframes } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MuiLink from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { BRAND, primaryCtaSx } from '@/lib/brand';

const STORAGE_KEY = 'stepay_cookie_notice_accepted';

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      // private mode / blocked storage — still show notice
    }
    setVisible(true);
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Box
      role="dialog"
      aria-label="Cookie notice"
      sx={{
        position: 'fixed',
        right: { xs: 12, sm: 24 },
        bottom: { xs: 12, sm: 24 },
        zIndex: 1400,
        maxWidth: 420,
        width: { xs: 'auto', sm: 420 },
        // Leave room for the support FAB on the left on small screens
        left: { xs: 76, sm: 'auto' },
        ml: { sm: 'auto' },
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        border: `1px solid ${BRAND.border}`,
        bgcolor: alpha(BRAND.surface, 0.96),
        backdropFilter: 'blur(16px)',
        boxShadow: `0 16px 48px ${alpha('#000', 0.45)}`,
        animation: `${slideUp} 0.35s ease-out`,
      }}
    >
      <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', mb: 0.75 }}>
        Cookies
      </Typography>
      <Typography sx={{ fontSize: '0.8125rem', color: alpha('#fff', 0.55), lineHeight: 1.6, mb: 2 }}>
        We use essential cookies to keep you signed in and secure your wallet session. See our{' '}
        <MuiLink
          component={Link}
          href="/privacy"
          underline="hover"
          sx={{ color: BRAND.accent, fontWeight: 600 }}
        >
          Privacy Policy
        </MuiLink>{' '}
        for details.
      </Typography>
      <Button
        type="button"
        variant="contained"
        onClick={accept}
        fullWidth
        sx={{ ...primaryCtaSx, py: 1.1, fontSize: '0.875rem' }}
      >
        Accept
      </Button>
    </Box>
  );
}
