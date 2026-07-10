'use client';

import { alpha } from '@mui/material/styles';
import { ArrowLeftRight, History, Home, Send, Wallet } from 'lucide-react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/** Inline SVG — Google Play-style badge (simplified; not official artwork). */
function GooglePlayBadgeIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M3 20.5v-17l10.7 8.5z" />
      <path fill="#FBBC04" d="M3 3.5l6.8 5.4L13.7 12 9.8 18.1z" />
      <path fill="#34A853" d="M21.3 10.6L13.7 12l-3.9 6.1L3 20.5z" />
      <path fill="#4285F4" d="M3 3.5l10.7 8.5L21.3 10.6 13.7 12z" />
    </svg>
  );
}

function MockScreen() {
  return (
    <Box
      sx={{
        height: '100%',
        minHeight: { xs: 480, sm: 520 },
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#f1f5f9',
      }}
    >
      {/* Status bar */}
      <Box
        sx={{
          px: 2,
          pt: 1.25,
          pb: 0.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: '#fff',
          borderBottom: '1px solid',
          borderColor: alpha('#0f172a', 0.06),
        }}
      >
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.02em', color: 'grey.900' }}>
          9:41
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 14, height: 8, border: '1px solid', borderColor: 'grey.400', borderRadius: '2px' }} />
          <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'grey.500' }} />
        </Stack>
      </Box>

      {/* App header */}
      <Box sx={{ px: 2, py: 2, bgcolor: '#fff' }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.03em', color: 'grey.900' }}>
          Stepay
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          Home
        </Typography>
      </Box>

      {/* Balance card */}
      <Box sx={{ px: 2, pb: 2 }}>
        <Box
          sx={{
            borderRadius: '16px',
            p: 2.25,
            background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 55%, #134e4a 100%)',
            color: '#fff',
            boxShadow: `0 16px 36px ${alpha('#0d9488', 0.35)}`,
          }}
        >
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', opacity: 0.85 }}>
            XLM BALANCE
          </Typography>
          <Typography sx={{ mt: 1, fontWeight: 800, fontSize: '1.65rem', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            1,234.56
          </Typography>
          <Typography sx={{ mt: 0.75, fontSize: '0.8rem', opacity: 0.88, fontWeight: 500 }}>
            ≈ ZMW 24,180.00
          </Typography>
        </Box>
      </Box>

      {/* Quick actions */}
      <Stack direction="row" spacing={1} sx={{ px: 2, pb: 2, justifyContent: 'space-between' }}>
        {[
          { label: 'Deposit', Icon: ArrowLeftRight, bg: alpha('#059669', 0.12), fg: '#059669' },
          { label: 'Send', Icon: Send, bg: alpha('#6366f1', 0.12), fg: '#4f46e5' },
          { label: 'Cash out', Icon: Wallet, bg: alpha('#0d9488', 0.12), fg: '#0f766e' },
        ].map(({ label, Icon, bg, fg }) => (
          <Box
            key={label}
            sx={{
              flex: 1,
              py: 1.5,
              borderRadius: '14px',
              bgcolor: '#fff',
              border: '1px solid',
              borderColor: alpha('#0f172a', 0.06),
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            <Box sx={{ color: fg, bgcolor: bg, borderRadius: '10px', p: 0.75, display: 'flex' }}>
              <Icon size={18} strokeWidth={2.25} />
            </Box>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'grey.800' }}>{label}</Typography>
          </Box>
        ))}
      </Stack>

      {/* Recent */}
      <Box sx={{ px: 2, pb: 1.5, flex: 1 }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.06em', mb: 1 }}>
          RECENT
        </Typography>
        <Box
          sx={{
            bgcolor: '#fff',
            borderRadius: '14px',
            border: '1px solid',
            borderColor: alpha('#0f172a', 0.06),
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '12px',
                bgcolor: alpha('#059669', 0.12),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
              }}
            >
              <ArrowLeftRight size={18} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'grey.900' }}>Deposit</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Today · Completed
              </Typography>
            </Box>
          </Stack>
          <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#059669' }}>+42 XLM</Typography>
        </Box>
      </Box>

      {/* Bottom nav */}
      <Box
        sx={{
          mt: 'auto',
          px: 2,
          py: 1.25,
          bgcolor: '#fff',
          borderTop: '1px solid',
          borderColor: alpha('#0f172a', 0.06),
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
        }}
      >
        {[
          { Icon: Home, active: true },
          { Icon: ArrowLeftRight, active: false },
          { Icon: Send, active: false },
          { Icon: Wallet, active: false },
          { Icon: History, active: false },
        ].map(({ Icon, active }, i) => (
          <Box key={i} sx={{ color: active ? '#0d9488' : '#94a3b8', opacity: active ? 1 : 0.7 }}>
            <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function MobileAppShowcase() {
  return (
    <Box
      component="section"
      sx={{
        py: { xs: 10, lg: 14 },
        bgcolor: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 80% 60% at 100% 20%, ${alpha('#0d9488', 0.06)} 0%, transparent 50%)`,
          pointerEvents: 'none',
        }}
      />
      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <Grid container spacing={{ xs: 5, lg: 8 }} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Typography
              variant="overline"
              sx={{ letterSpacing: '0.22em', fontWeight: 700, color: 'primary.main', fontSize: '0.72rem' }}
            >
              Mobile app
            </Typography>
            <Typography
              variant="h4"
              component="h2"
              sx={{
                mt: 2,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                fontSize: { xs: '1.65rem', sm: '2.125rem' },
                lineHeight: 1.15,
                color: 'grey.900',
              }}
            >
              Stepay in your pocket
            </Typography>
            <Typography sx={{ mt: 2.5, color: 'text.secondary', fontSize: '1.05rem', lineHeight: 1.75, maxWidth: 480 }}>
              The same deposits, sends, and cash-outs — optimized for your phone. Push notifications and one-tap flows
              when we launch.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4, alignItems: { xs: 'flex-start', sm: 'center' } }}>
              <Box sx={{ position: 'relative' }}>
                <Button
                  type="button"
                  disabled
                  variant="contained"
                  sx={{
                    bgcolor: '#000',
                    color: '#fff',
                    py: 1.25,
                    px: 2,
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    gap: 1.5,
                    cursor: 'default',
                    '&.Mui-disabled': {
                      bgcolor: '#1a1a1a',
                      color: '#fff',
                    },
                  }}
                  startIcon={<GooglePlayBadgeIcon />}
                >
                  <Box sx={{ textAlign: 'left', lineHeight: 1.15 }}>
                    <Typography sx={{ fontSize: '0.65rem', opacity: 0.85, fontWeight: 500 }}>GET IT ON</Typography>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Google Play</Typography>
                  </Box>
                </Button>
                <Chip
                  label="Coming soon"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: -10,
                    right: -8,
                    fontWeight: 800,
                    fontSize: '0.65rem',
                    height: 22,
                    bgcolor: 'secondary.main',
                    color: 'secondary.contrastText',
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              </Box>
              <Chip
                label="App Store — coming soon"
                variant="outlined"
                sx={{
                  borderColor: alpha('#0f172a', 0.15),
                  fontWeight: 600,
                  color: 'text.secondary',
                  py: 2.25,
                  height: 'auto',
                }}
              />
            </Stack>

            <Typography variant="body2" sx={{ mt: 3, color: 'text.secondary', maxWidth: 420 }}>
              Native Android first; iOS to follow. Join the web app today — your account will carry over.
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                perspective: '1200px',
              }}
            >
              {/* Phone chassis */}
              <Box
                sx={{
                  position: 'relative',
                  width: { xs: 'min(100%, 290px)', sm: 300 },
                  borderRadius: '44px',
                  p: '11px',
                  background: `linear-gradient(160deg, #2d3548 0%, #12151c 45%, #1a1f2e 100%)`,
                  boxShadow: `
                    0 50px 100px -28px ${alpha('#000', 0.55)},
                    0 0 0 1px ${alpha('#fff', 0.08)} inset,
                    0 -20px 40px -20px ${alpha('#0d9488', 0.15)} inset
                  `,
                  transform: { lg: 'rotateY(-6deg) rotateX(2deg)' },
                  transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
                  '&:hover': {
                    transform: { lg: 'rotateY(-2deg) rotateX(0deg) scale(1.02)' },
                  },
                }}
              >
                {/* Side button */}
                <Box
                  sx={{
                    position: 'absolute',
                    right: -3,
                    top: '22%',
                    width: 4,
                    height: 52,
                    borderRadius: '0 4px 4px 0',
                    bgcolor: '#3f4656',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    left: -3,
                    top: '18%',
                    width: 4,
                    height: 36,
                    borderRadius: '4px 0 0 4px',
                    bgcolor: '#3f4656',
                  }}
                />
                {/* Dynamic Island */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 14,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 96,
                    height: 28,
                    borderRadius: '20px',
                    bgcolor: '#0a0c10',
                    zIndex: 4,
                    boxShadow: `0 4px 16px ${alpha('#000', 0.45)}`,
                  }}
                />
                {/* Screen */}
                <Box
                  sx={{
                    borderRadius: '36px',
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: alpha('#fff', 0.06),
                    bgcolor: '#f1f5f9',
                  }}
                >
                  <MockScreen />
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
