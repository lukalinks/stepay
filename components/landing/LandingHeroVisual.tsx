'use client';

import { alpha, keyframes } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { LandingAfricaMap } from '@/components/landing/LandingAfricaMap';
import { LandingDashboardPreview } from '@/components/landing/LandingDashboardPreview';
import { BRAND } from '@/lib/brand';

const floatY = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

export function LandingHeroVisual() {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: { xs: 290, sm: 310, lg: 330 },
        minHeight: { xs: 480, md: 500 },
        mx: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <LandingAfricaMap />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          animation: `${floatY} 7s ease-in-out infinite`,
          filter: `drop-shadow(0 24px 48px ${alpha('#000', 0.5)})`,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: '-15%',
            background: `radial-gradient(ellipse at center, ${alpha(BRAND.accent, 0.2)} 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <LandingDashboardPreview />
      </Box>
    </Box>
  );
}
