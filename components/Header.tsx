'use client';

import Link from 'next/link';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { Logo } from './Logo';

interface HeaderProps {
  /** Right-side content (e.g. nav links, menu button) */
  right?: React.ReactNode;
  /** Show "← Back" link (for secondary pages) */
  showBack?: boolean;
  /** Max width of inner content: 'full' | 'content' | 'narrow' */
  maxWidth?: 'full' | 'content' | 'narrow';
  /** Logo size */
  logoSize?: 'sm' | 'md' | 'lg';
  /** Optional class for logo (e.g. text-xl for larger wordmark) */
  logoClassName?: string;
  className?: string;
}

const maxWidthPx: Record<NonNullable<HeaderProps['maxWidth']>, number> = {
  full: 1280,
  content: 1024,
  narrow: 768,
};

export function Header({
  right,
  showBack = false,
  maxWidth = 'full',
  logoSize = 'md',
  logoClassName = '',
  className = '',
}: HeaderProps) {
  const mw = maxWidthPx[maxWidth];

  return (
    <AppBar
      position="sticky"
      elevation={0}
      className={className}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        pt: 'max(12px, env(safe-area-inset-top))',
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          minHeight: { xs: 56, sm: 64 },
          px: { xs: 2, sm: 3 },
          pb: { xs: 1.5, sm: 2 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            width: '100%',
            maxWidth: mw,
            mx: 'auto',
          }}
        >
          <Button
            component={Link}
            href="/"
            disableRipple
            sx={{
              minWidth: 40,
              minHeight: 40,
              p: 1,
              m: -1,
              borderRadius: 2,
              color: 'text.primary',
              textTransform: 'none',
              '&:hover': { bgcolor: 'transparent', opacity: 0.85 },
            }}
          >
            <span className={logoClassName}>
              <Logo iconOnly={false} size={logoSize} variant="light" />
            </span>
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
            {showBack && (
              <Button
                component={Link}
                href="/"
                variant="text"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 500,
                  '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
                }}
              >
                ← Back
              </Button>
            )}
            {right}
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
