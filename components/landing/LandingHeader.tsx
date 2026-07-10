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
import { landing } from '@/lib/landing-ui';

const NAV = [
  { label: 'How it works', href: '/#how' },
  { label: 'Features', href: '/#about' },
  { label: 'Developers', href: '/developers' },
  { label: 'FAQ', href: '/#faq' },
];

const navLinkSx = {
  px: 2,
  py: 0.75,
  borderRadius: 999,
  color: alpha('#fff', 0.72),
  fontSize: '0.8125rem',
  fontWeight: 500,
  textTransform: 'none' as const,
  minHeight: 40,
  '&:hover': {
    color: '#fff',
    bgcolor: alpha('#fff', 0.06),
  },
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

  const primaryAction =
    auth === 'in' ? (
      <Button component={Link} href="/dashboard" variant="contained" sx={landing.primaryCta}>
        Dashboard
      </Button>
    ) : (
      <Button component={Link} href="/signup?next=/dashboard" variant="contained" sx={landing.primaryCta}>
        Open free account
      </Button>
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
          bgcolor: alpha(BRAND.bg, 0.82),
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
                gap: 0.25,
                alignItems: 'center',
                px: 0.75,
                py: 0.5,
                borderRadius: 999,
                bgcolor: alpha('#fff', 0.04),
                border: `1px solid ${BRAND.border}`,
              }}
            >
              {NAV.map((item) => (
                <Button key={item.label} component={Link} href={item.href} sx={navLinkSx}>
                  {item.label}
                </Button>
              ))}
            </Stack>

            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
              {auth === 'loading' ? (
                <CircularProgress size={20} sx={{ color: BRAND.accent }} />
              ) : (
                <>
                  {auth === 'out' && (
                    <Button component={Link} href="/login" sx={{ ...navLinkSx, display: { xs: 'none', sm: 'inline-flex' } }}>
                      Sign in
                    </Button>
                  )}
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>{primaryAction}</Box>
                  <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                    <Button
                      component={Link}
                      href={auth === 'in' ? '/dashboard' : '/signup?next=/dashboard'}
                      variant="contained"
                      size="small"
                      sx={{ ...landing.primaryCta, minHeight: 40, px: 2, fontSize: '0.8125rem' }}
                    >
                      {auth === 'in' ? 'Dashboard' : 'Start'}
                    </Button>
                  </Box>
                </>
              )}
              <IconButton
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
                sx={{
                  display: { xs: 'inline-flex', md: 'none' },
                  color: '#fff',
                  bgcolor: alpha('#fff', 0.06),
                  border: `1px solid ${BRAND.border}`,
                  borderRadius: 2,
                }}
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
          <Typography sx={{ ...landing.sectionLabel, mb: 0 }}>Menu</Typography>
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
                borderRadius: 2,
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
            <Button component={Link} href="/dashboard" variant="contained" fullWidth onClick={() => setMobileOpen(false)} sx={landing.primaryCta}>
              Open dashboard
            </Button>
          ) : (
            <>
              <Button component={Link} href="/login" fullWidth onClick={() => setMobileOpen(false)} sx={navLinkSx}>
                Sign in
              </Button>
              <Button component={Link} href="/signup?next=/dashboard" variant="contained" fullWidth onClick={() => setMobileOpen(false)} sx={landing.primaryCta}>
                Open free account
              </Button>
            </>
          )}
        </Stack>
      </Drawer>
    </>
  );
}
