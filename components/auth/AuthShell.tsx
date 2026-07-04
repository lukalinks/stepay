'use client';

import Link from 'next/link';
import { Suspense, useEffect } from 'react';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Logo } from '@/components/Logo';
import { AuthModeTabs } from '@/components/auth/AuthModeTabs';
import { BRAND, glassCardSx } from '@/lib/brand';

type AuthShellProps = {
  mode?: 'login' | 'signup';
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

function AuthGlow() {
  return (
    <Box
      aria-hidden
      sx={{
        pointerEvents: 'none',
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        background: `
          radial-gradient(ellipse 70% 50% at 80% -10%, ${alpha(BRAND.accent, 0.18)} 0%, transparent 55%),
          radial-gradient(ellipse 50% 40% at 10% 90%, ${alpha(BRAND.accent, 0.06)} 0%, transparent 50%),
          ${BRAND.bg}
        `,
      }}
    />
  );
}

function AuthShellInner({ mode, title, subtitle, children, footer }: AuthShellProps) {
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = BRAND.bg;
    document.body.classList.add('dashboard-grain');
    return () => {
      document.body.style.backgroundColor = prev;
      document.body.classList.remove('dashboard-grain');
    };
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: BRAND.bg, color: '#fff', position: 'relative' }}>
      <AuthGlow />
      <Box sx={{ position: 'relative', zIndex: 1, pt: 'max(16px, env(safe-area-inset-top))', pb: 2, px: 2 }}>
        <Stack sx={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 480, mx: 'auto', width: '100%' }}>
          <Button component={Link} href="/" sx={{ p: 0, minWidth: 0, color: '#fff', '&:hover': { bgcolor: 'transparent', opacity: 0.9 } }}>
            <Logo iconOnly={false} size="md" variant="neon" className="text-white" />
          </Button>
          <Button
            component={Link}
            href="/"
            sx={{ color: BRAND.textMuted, fontWeight: 500, textTransform: 'none', borderRadius: 999, px: 2, '&:hover': { color: '#fff', bgcolor: alpha('#fff', 0.06) } }}
          >
            ← Home
          </Button>
        </Stack>
      </Box>

      <Container
        maxWidth="sm"
        sx={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          py: { xs: 2, sm: 4 },
          px: { xs: 1.5, sm: 2 },
          pb: { xs: 'max(24px, env(safe-area-inset-bottom))', sm: 4 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            p: { xs: 2.5, sm: 4 },
            ...glassCardSx,
            maxWidth: 420,
            mx: 'auto',
          }}
        >
          {mode && (
            <Suspense fallback={null}>
              <AuthModeTabs mode={mode} />
            </Suspense>
          )}
          <Stack spacing={0.75} sx={{ mb: 3 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
              {title}
            </Typography>
            <Typography sx={{ color: BRAND.textMuted, fontSize: '0.9375rem', lineHeight: 1.6 }}>{subtitle}</Typography>
          </Stack>
          {children}
          {footer && (
            <Typography variant="body2" sx={{ mt: 3, textAlign: 'center', color: BRAND.textMuted }}>
              {footer}
            </Typography>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export function AuthShell(props: AuthShellProps) {
  return <AuthShellInner {...props} />;
}
