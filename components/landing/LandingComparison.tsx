'use client';

import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Check, X } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { landing } from '@/lib/landing-ui';

const ACCENT = BRAND.accent;

const ROWS = [
  { label: 'Account setup', traditional: 'Days, branch visit', stepay: 'Under 1 minute, online' },
  { label: 'Cross-border transfer', traditional: '2–5 business days', stepay: '~5 seconds on Stellar' },
  { label: 'Hold US dollars', traditional: 'FX account required', stepay: 'USDC in your wallet' },
  { label: 'Accept payments', traditional: 'Card terminal + fees', stepay: 'QR code or link, no hardware' },
  { label: 'Who holds your funds', traditional: 'The bank', stepay: 'You — non-custodial keys' },
  { label: 'Cash in / cash out', traditional: 'Bank transfer only', stepay: 'Mobile money on-ramp' },
];

function CellIcon({ ok }: { ok: boolean }) {
  return (
    <Box
      sx={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        bgcolor: ok ? BRAND.accentMuted : alpha('#fff', 0.04),
        border: `1px solid ${ok ? BRAND.accentBorder : BRAND.border}`,
        color: ok ? ACCENT : alpha('#fff', 0.3),
        flexShrink: 0,
      }}
    >
      {ok ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
    </Box>
  );
}

export function LandingComparison() {
  return (
    <Box
      component="section"
      sx={{
        py: landing.sectionPy,
        bgcolor: alpha('#fff', 0.015),
        borderTop: `1px solid ${BRAND.border}`,
        borderBottom: `1px solid ${BRAND.border}`,
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <Grid container spacing={{ xs: 5, md: 8 }} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography sx={landing.sectionLabel}>Why switch</Typography>
            <Typography
              variant="h4"
              sx={{ ...landing.heading, mt: 2, fontSize: { xs: '1.75rem', md: '2.125rem' } }}
            >
              Banking wasn&apos;t built for how Africa moves money
            </Typography>
            <Typography sx={{ mt: 2, ...landing.body, maxWidth: 400 }}>
              Stepay gives you the speed of mobile money, the stability of dollar assets, and the control of a self-custodial wallet — without a bank account.
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Box
              sx={{
                borderRadius: 3,
                border: `1px solid ${BRAND.borderStrong}`,
                overflow: 'hidden',
                bgcolor: alpha('#fff', 0.02),
                boxShadow: `0 24px 64px ${alpha('#000', 0.3)}`,
              }}
            >
              <Grid
                container
                sx={{
                  px: { xs: 2, sm: 2.5 },
                  py: 1.75,
                  borderBottom: `1px solid ${BRAND.border}`,
                  bgcolor: alpha('#fff', 0.03),
                }}
              >
                <Grid size={{ xs: 4 }}>
                  <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: BRAND.textSubtle, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    &nbsp;
                  </Typography>
                </Grid>
                <Grid size={{ xs: 4 }} sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: BRAND.textSubtle, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Traditional
                  </Typography>
                </Grid>
                <Grid size={{ xs: 4 }} sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.6875rem', fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Stepay
                  </Typography>
                </Grid>
              </Grid>

              {ROWS.map((row, i) => (
                <Grid
                  key={row.label}
                  container
                  sx={{
                    px: { xs: 2, sm: 2.5 },
                    py: { xs: 1.75, sm: 2 },
                    alignItems: 'center',
                    borderBottom: i < ROWS.length - 1 ? `1px solid ${BRAND.border}` : 'none',
                    '&:hover': { bgcolor: alpha('#fff', 0.02) },
                  }}
                >
                  <Grid size={{ xs: 12, sm: 4 }} sx={{ mb: { xs: 1, sm: 0 } }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.label}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: { sm: 'center' } }}>
                      <CellIcon ok={false} />
                      <Typography sx={{ fontSize: '0.75rem', color: BRAND.textSubtle, lineHeight: 1.45, maxWidth: 120 }}>
                        {row.traditional}
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: { sm: 'center' } }}>
                      <CellIcon ok />
                      <Typography sx={{ fontSize: '0.75rem', color: alpha('#fff', 0.75), fontWeight: 500, lineHeight: 1.45, maxWidth: 130 }}>
                        {row.stepay}
                      </Typography>
                    </Stack>
                  </Grid>
                </Grid>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
