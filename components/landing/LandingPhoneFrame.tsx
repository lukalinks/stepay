'use client';

import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { BRAND } from '@/lib/brand';

export const LANDING_PHONE_W = 272;
export const LANDING_PHONE_H = 460;

type LandingPhoneFrameProps = {
  children: React.ReactNode;
  /** Page title shown below status bar */
  title?: string;
  /** Slightly wider frame for feature showcase rows */
  size?: 'default' | 'feature';
};

export function LandingPhoneFrame({ children, title, size = 'default' }: LandingPhoneFrameProps) {
  const maxW = size === 'feature' ? 300 : LANDING_PHONE_W;

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: maxW,
        mx: 'auto',
        p: '7px',
        borderRadius: '36px',
        bgcolor: '#1a1a1a',
        border: `1px solid ${BRAND.borderStrong}`,
        boxShadow: `
          0 32px 64px rgba(0,0,0,0.55),
          inset 0 1px 0 rgba(255,255,255,0.12),
          inset 0 -1px 0 rgba(0,0,0,0.4)
        `,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <Box
        className="dashboard-grain"
        sx={{
          position: 'relative',
          width: '100%',
          height: LANDING_PHONE_H,
          borderRadius: '28px',
          bgcolor: BRAND.bg,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${BRAND.borderStrong}`,
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.25,
            pt: 0.5,
            pb: 0.15,
            bgcolor: BRAND.bg,
          }}
        >
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: alpha('#fff', 0.5) }}>9:41</Typography>
          <Box sx={{ width: 64, height: 18, borderRadius: 999, bgcolor: '#000', border: `1px solid ${BRAND.border}` }} />
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: alpha('#fff', 0.5) }}>●●●</Typography>
        </Box>

        {title ? (
          <Box
            sx={{
              flexShrink: 0,
              px: 1.25,
              py: 0.75,
              borderBottom: `1px solid ${BRAND.border}`,
              bgcolor: BRAND.bg,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', lineHeight: 1.2 }} noWrap>
              {title}
            </Typography>
          </Box>
        ) : null}

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            bgcolor: BRAND.bg,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </Box>

        <Box sx={{ flexShrink: 0, py: 0.35, display: 'flex', justifyContent: 'center', bgcolor: BRAND.bg }}>
          <Box sx={{ width: 72, height: 3, borderRadius: 999, bgcolor: alpha('#fff', 0.2) }} />
        </Box>
      </Box>
    </Box>
  );
}
