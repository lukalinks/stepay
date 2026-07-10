'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { BRAND } from '@/lib/brand';

type AuthMode = 'login' | 'signup';

export function AuthModeTabs({ mode }: { mode: AuthMode }) {
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const email = searchParams.get('email');

  const qs = new URLSearchParams();
  if (next) qs.set('next', next);
  if (email) qs.set('email', email);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';

  const tabSx = (active: boolean) => ({
    flex: 1,
    py: 1.1,
    borderRadius: 999,
    fontWeight: 700,
    fontSize: '0.875rem',
    textTransform: 'none' as const,
    color: active ? BRAND.bg : BRAND.textMuted,
    bgcolor: active ? BRAND.accent : 'transparent',
    boxShadow: active ? `0 0 20px ${BRAND.accentMuted}` : 'none',
    '&:hover': {
      bgcolor: active ? BRAND.accentHover : alpha('#fff', 0.06),
      color: active ? BRAND.bg : '#fff',
    },
  });

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.5,
        p: 0.5,
        mb: 3,
        borderRadius: 999,
        bgcolor: alpha('#fff', 0.04),
        border: `1px solid ${BRAND.border}`,
      }}
      role="tablist"
      aria-label="Authentication mode"
    >
      <Button component={Link} href={`/login${suffix}`} role="tab" aria-selected={mode === 'login'} sx={tabSx(mode === 'login')}>
        Sign in
      </Button>
      <Button component={Link} href={`/signup${suffix}`} role="tab" aria-selected={mode === 'signup'} sx={tabSx(mode === 'signup')}>
        Sign up
      </Button>
    </Box>
  );
}
