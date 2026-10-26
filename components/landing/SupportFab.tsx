'use client';

import { useState } from 'react';
import Link from 'next/link';
import { alpha, keyframes } from '@mui/material/styles';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MuiLink from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { HelpCircle, Mail, MessageCircle, X } from 'lucide-react';
import { BRAND } from '@/lib/brand';

const SUPPORT_EMAIL = 'support@stepay.pro';

const popIn = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

export function SupportFab() {
  const [open, setOpen] = useState(false);

  return (
    <Box
      sx={{
        position: 'fixed',
        left: { xs: 12, sm: 24 },
        bottom: { xs: 12, sm: 24 },
        zIndex: 1400,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 1.25,
      }}
    >
      {open && (
        <Box
          role="dialog"
          aria-label="Support"
          sx={{
            width: { xs: 260, sm: 280 },
            p: 2,
            borderRadius: 3,
            border: `1px solid ${BRAND.border}`,
            bgcolor: alpha(BRAND.surface, 0.96),
            backdropFilter: 'blur(16px)',
            boxShadow: `0 16px 48px ${alpha('#000', 0.45)}`,
            animation: `${popIn} 0.22s ease-out`,
          }}
        >
          <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', mb: 0.5 }}>
            Need help?
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: alpha('#fff', 0.5), lineHeight: 1.5, mb: 1.75 }}>
            We're here for deposits, cash-outs, and account questions.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <MuiLink
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Stepay support')}`}
              underline="none"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.25,
                py: 1,
                borderRadius: 2,
                color: '#fff',
                bgcolor: alpha('#fff', 0.04),
                border: `1px solid ${BRAND.border}`,
                fontSize: '0.8125rem',
                fontWeight: 600,
                transition: 'background 0.15s ease',
                '&:hover': { bgcolor: alpha(BRAND.accent, 0.12), borderColor: BRAND.accentBorder },
              }}
            >
              <Mail size={16} color={BRAND.accent} />
              Email {SUPPORT_EMAIL}
            </MuiLink>
            <MuiLink
              component={Link}
              href="/#faq"
              underline="none"
              onClick={() => setOpen(false)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.25,
                py: 1,
                borderRadius: 2,
                color: '#fff',
                bgcolor: alpha('#fff', 0.04),
                border: `1px solid ${BRAND.border}`,
                fontSize: '0.8125rem',
                fontWeight: 600,
                transition: 'background 0.15s ease',
                '&:hover': { bgcolor: alpha(BRAND.accent, 0.12), borderColor: BRAND.accentBorder },
              }}
            >
              <HelpCircle size={16} color={BRAND.accent} />
              Browse FAQ
            </MuiLink>
          </Box>
        </Box>
      )}

      <IconButton
        type="button"
        aria-label={open ? 'Close support' : 'Open support'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        sx={{
          width: 52,
          height: 52,
          bgcolor: BRAND.accent,
          color: BRAND.accentContrast,
          boxShadow: `0 8px 28px ${alpha(BRAND.accent, 0.35)}`,
          '&:hover': { bgcolor: BRAND.accent, filter: 'brightness(1.05)' },
        }}
      >
        {open ? <X size={22} strokeWidth={2.25} /> : <MessageCircle size={22} strokeWidth={2.25} />}
      </IconButton>
    </Box>
  );
}
