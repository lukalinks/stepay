'use client';

import { alpha, keyframes } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ArrowDownLeft, Send } from 'lucide-react';
import { LandingAfricaMap } from '@/components/landing/LandingAfricaMap';
import { LandingDashboardPreview } from '@/components/landing/LandingDashboardPreview';
import { BRAND } from '@/lib/brand';

const floatY = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

const floatCard = keyframes`
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-6px) rotate(-2deg); }
`;

const floatCardAlt = keyframes`
  0%, 100% { transform: translateY(0) rotate(2deg); }
  50% { transform: translateY(-5px) rotate(2deg); }
`;

function FloatingCard({
  icon: Icon,
  title,
  amount,
  side,
}: {
  icon: typeof Send;
  title: string;
  amount: string;
  side: 'left' | 'right';
}) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: side === 'left' ? '18%' : '62%',
        [side]: { xs: '-8%', sm: '-14%', lg: '-18%' },
        zIndex: 2,
        display: { xs: 'none', sm: 'block' },
        animation: `${side === 'left' ? floatCard : floatCardAlt} 5s ease-in-out infinite`,
        animationDelay: side === 'left' ? '0.3s' : '0.8s',
      }}
    >
      <Box
        sx={{
          px: 1.75,
          py: 1.25,
          borderRadius: 2.5,
          bgcolor: alpha(BRAND.surfaceRaised, 0.92),
          border: `1px solid ${BRAND.borderStrong}`,
          backdropFilter: 'blur(16px)',
          boxShadow: `0 12px 32px ${alpha('#000', 0.45)}`,
          minWidth: 148,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              bgcolor: BRAND.accentMuted,
              display: 'grid',
              placeItems: 'center',
              color: BRAND.accent,
            }}
          >
            <Icon size={12} strokeWidth={2.5} />
          </Box>
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: alpha('#fff', 0.55) }}>
            {title}
          </Typography>
        </Box>
        <Typography
          sx={{
            fontFamily: 'var(--font-geist-mono), monospace',
            fontWeight: 700,
            fontSize: '0.875rem',
            color: BRAND.accent,
            letterSpacing: '-0.02em',
          }}
        >
          {amount}
        </Typography>
      </Box>
    </Box>
  );
}

export function LandingHeroVisual() {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: { xs: 290, sm: 340, lg: 380 },
        minHeight: { xs: 480, md: 520 },
        mx: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <LandingAfricaMap />

      <FloatingCard icon={Send} title="Sent to Lusaka" amount="+ $120.00" side="left" />
      <FloatingCard icon={ArrowDownLeft} title="Received from Ndola" amount="+ ZMW 3,120" side="right" />

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
            background: `radial-gradient(ellipse at center, ${alpha(BRAND.accent, 0.22)} 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <LandingDashboardPreview />
      </Box>
    </Box>
  );
}
