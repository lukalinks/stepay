'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';

const NAV = [
  { label: 'Deposit', href: '/signup?next=/dashboard/buy' },
  { label: 'Send', href: '/signup?next=/dashboard/send' },
  { label: 'Cash out', href: '/signup?next=/dashboard/sell' },
  { label: 'Features', href: '/#about' },
];

const pillSx = {
  px: 2.25,
  py: 0.85,
  borderRadius: 999,
  color: alpha('#fff', 0.72),
  fontSize: '0.875rem',
  fontWeight: 500,
  textTransform: 'none' as const,
  minHeight: 40,
  '&:hover': {
    color: '#fff',
    bgcolor: alpha('#fff', 0.06),
  },
};

const ctaWhiteSx = {
  borderRadius: 999,
  px: 2.5,
  bgcolor: '#fff',
  color: BRAND.bg,
  fontWeight: 700,
  boxShadow: 'none',
  '&:hover': { bgcolor: alpha('#fff', 0.92) },
};

export function LandingHeader() {
  const [auth, setAuth] = useState<'loading' | 'in' | 'out'>('loading');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch('/api/user', { credentials: 'include' })
      .then((r) => setAuth(r.ok ? 'in' : 'out'))
      .catch(() => setAuth('out'));
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const authButtons = (
    <>
      {auth === 'loading' ? (
        <CircularProgress size={20} sx={{ color: BRAND.accent }} />
      ) : auth === 'in' ? (
        <Button component={Link} href="/dashboard" variant="contained" sx={ctaWhiteSx}>
          Dashboard
        </Button>
      ) : (
        <>
          <Button component={Link} href="/login" sx={{ ...pillSx, display: { xs: 'none', sm: 'inline-flex' } }}>
            Sign in
          </Button>
          <Button component={Link} href="/signup?next=/dashboard" variant="contained" sx={{ ...ctaWhiteSx, px: { xs: 2, sm: 2.75 } }}>
            Get started
          </Button>
        </>
      )}
    </>
  );

  return (
    <>
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          pt: 'max(12px, env(safe-area-inset-top))',
          pb: 1.5,
          bgcolor: alpha(BRAND.bg, 0.72),
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${BRAND.border}`,
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Stack sx={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Button component={Link} href="/" sx={{ p: 0, minWidth: 0, color: '#fff', '&:hover': { bgcolor: 'transparent', opacity: 0.9 } }}>
              <Logo iconOnly={false} size="md" variant="neon" className="text-white text-lg sm:text-xl" />
            </Button>

            <Stack
              sx={{
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'row',
                gap: 0.5,
                alignItems: 'center',
                px: 1,
                py: 0.5,
                borderRadius: 999,
                bgcolor: alpha('#fff', 0.04),
                border: `1px solid ${BRAND.border}`,
              }}
            >
              {NAV.map((item) => (
                <Button key={item.label} component={Link} href={item.href} sx={pillSx}>
                  {item.label}
                </Button>
              ))}
            </Stack>

            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1.25 }}>
              <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center' }}>
                {auth === 'loading' ? (
                  <CircularProgress size={18} sx={{ color: BRAND.accent }} />
                ) : auth === 'in' ? (
                  <Button
                    component={Link}
                    href="/dashboard"
                    variant="contained"
                    size="small"
                    sx={{ ...ctaWhiteSx, minHeight: 36, px: 1.75, fontSize: '0.8125rem' }}
                  >
                    Dashboard
                  </Button>
                ) : (
                  <Button
                    component={Link}
                    href="/signup?next=/dashboard"
                    variant="contained"
                    size="small"
                    sx={{ ...ctaWhiteSx, minHeight: 36, px: 1.75, fontSize: '0.8125rem' }}
                  >
                    Start
                  </Button>
                )}
              </Box>
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.25 }}>{authButtons}</Box>
              <IconButton
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
                sx={{ display: { xs: 'inline-flex', md: 'none' }, color: '#fff', bgcolor: alpha('#fff', 0.06), border: `1px solid ${BRAND.border}` }}
              >
                <Menu size={20} />
              </IconButton>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: 'min(300px, 88vw)',
              bgcolor: BRAND.surface,
              color: '#fff',
              borderLeft: `1px solid ${BRAND.border}`,
            },
          },
        }}
      >
        <Stack sx={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 2, borderBottom: `1px solid ${BRAND.border}` }}>
          <Typography sx={{ fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.75rem', color: BRAND.textMuted, textTransform: 'uppercase' }}>
            Menu
          </Typography>
          <IconButton aria-label="Close menu" onClick={() => setMobileOpen(false)} sx={{ color: '#fff' }}>
            <X size={20} />
          </IconButton>
        </Stack>
        <Stack sx={{ p: 2, gap: 0.5 }}>
          {NAV.map((item) => (
            <Button
              key={item.label}
              component={Link}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              fullWidth
              sx={{
                justifyContent: 'flex-start',
                borderRadius: 2.5,
                py: 1.25,
                px: 2,
                color: alpha('#fff', 0.85),
                fontWeight: 500,
                textTransform: 'none',
                '&:hover': { bgcolor: alpha('#fff', 0.06) },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Stack>
        <Stack sx={{ p: 2, mt: 'auto', gap: 1.25, borderTop: `1px solid ${BRAND.border}` }}>
          {auth === 'in' ? (
            <Button component={Link} href="/dashboard" variant="contained" fullWidth onClick={() => setMobileOpen(false)} sx={ctaWhiteSx}>
              Open dashboard
            </Button>
          ) : (
            <>
              <Button component={Link} href="/login" fullWidth onClick={() => setMobileOpen(false)} sx={{ ...pillSx, justifyContent: 'center' }}>
                Sign in
              </Button>
              <Button component={Link} href="/signup?next=/dashboard" variant="contained" fullWidth onClick={() => setMobileOpen(false)} sx={ctaWhiteSx}>
                Get started
              </Button>
            </>
          )}
        </Stack>
      </Drawer>
    </>
  );
}
