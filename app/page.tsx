'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { alpha, keyframes } from '@mui/material/styles';
import { ArrowRight, Check } from 'lucide-react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import MuiLink from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CookieNotice } from '@/components/landing/CookieNotice';
import { SupportFab } from '@/components/landing/SupportFab';
import { LandingHeroVisual } from '@/components/landing/LandingHeroVisual';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingUseCases } from '@/components/landing/LandingUseCases';
import { LandingComparison } from '@/components/landing/LandingComparison';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { landing, landingGlowSx } from '@/lib/landing-ui';

const ACCENT = BRAND.accent;

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;

const HERO_PERKS = [
  'No bank account required',
  'Mobile money in & out',
  'You control your keys',
];

const STEPS = [
  {
    step: '01',
    title: 'Create your wallet',
    desc: 'Sign up with email in under a minute. Your private keys are generated on your device — we never see them.',
  },
  {
    step: '02',
    title: 'Add funds',
    desc: 'Top up with mobile money from your phone. Local currency converts to USDC or XLM directly in your wallet.',
  },
  {
    step: '03',
    title: 'Send, save, or earn',
    desc: 'Transfer across borders, hold dollar assets, invoice clients, or accept payments. Cash out to mobile money anytime.',
  },
];

const STATS = [
  { value: '~5s', label: 'Typical settlement', desc: 'Stellar network speed' },
  { value: '$0', label: 'Hidden fees', desc: 'Transparent pricing' },
  { value: '100%', label: 'Key ownership', desc: 'Non-custodial wallet' },
];

const FOOTER_PRODUCT = [
  { label: 'Deposit', href: '/signup?next=/dashboard/buy' },
  { label: 'Send', href: '/signup?next=/dashboard/send' },
  { label: 'Swap', href: '/signup?next=/dashboard/swap' },
  { label: 'Accept payments', href: '/signup?next=/dashboard/merchant' },
  { label: 'Developers', href: '/developers' },
  { label: 'Cash out', href: '/signup?next=/dashboard/sell' },
];

export default function LandingPage() {
  useEffect(() => {
    document.body.classList.add('dashboard-grain');
    return () => document.body.classList.remove('dashboard-grain');
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BRAND.bg, color: '#fff', overflowX: 'hidden' }}>
      <Box aria-hidden sx={landingGlowSx} />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <LandingHeader />

        <Box component="main">
          {/* Hero */}
          <Box
            component="section"
            sx={{
              position: 'relative',
              pt: { xs: 4, md: 8 },
              pb: { xs: 6, md: 10 },
              overflow: 'hidden',
            }}
          >
            <Box aria-hidden sx={landing.heroGrid} />

            <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, position: 'relative' }}>
              <Grid container spacing={{ xs: 4, lg: 8 }} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, lg: 6 }} sx={{ order: { xs: 1, lg: 0 } }}>
                  <Box sx={{ animation: `${fadeUp} 0.6s ease-out both`, textAlign: { xs: 'center', lg: 'left' } }}>
                    <Typography component="span" sx={landing.badge}>
                      Built for Africa · Powered by Stellar
                    </Typography>

                    <Typography
                      component="h1"
                      sx={{
                        ...landing.heading,
                        lineHeight: 1.06,
                        fontSize: { xs: '2.5rem', sm: '3rem', lg: '3.5rem' },
                        mt: 0.5,
                      }}
                    >
                      Your dollar wallet
                      <Box component="span" sx={{ display: 'block', ...landing.gradientText }}>
                        for Africa
                      </Box>
                    </Typography>

                    <Typography
                      sx={{
                        mt: 2.5,
                        maxWidth: 460,
                        mx: { xs: 'auto', lg: 0 },
                        fontSize: { xs: '1.0625rem', sm: '1.125rem' },
                        lineHeight: 1.65,
                        color: BRAND.textMuted,
                      }}
                    >
                      Send money across borders, hold USDC, and get paid — all from one non-custodial wallet. No bank account needed.
                    </Typography>

                    <Stack spacing={1.25} sx={{ mt: 3, maxWidth: 400, mx: { xs: 'auto', lg: 0 } }}>
                      {HERO_PERKS.map((perk) => (
                        <Stack key={perk} direction="row" spacing={1.25} sx={{ alignItems: 'center', justifyContent: { xs: 'center', lg: 'flex-start' } }}>
                          <Box sx={landing.checkBadge}>
                            <Check size={12} color={ACCENT} strokeWidth={3} />
                          </Box>
                          <Typography sx={{ fontSize: '0.875rem', color: alpha('#fff', 0.7), fontWeight: 500 }}>
                            {perk}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>

                    <Button
                      component={Link}
                      href="/signup?next=/dashboard"
                      variant="contained"
                      endIcon={<ArrowRight size={18} />}
                      sx={{ mt: 3.5, ...landing.primaryCta }}
                    >
                      Open free account
                    </Button>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, lg: 6 }} sx={{ order: { xs: 0, lg: 1 } }}>
                  <Box sx={{ animation: `${fadeUp} 0.7s ease-out 0.06s both` }}>
                    <LandingHeroVisual />
                  </Box>
                </Grid>
              </Grid>
            </Container>
          </Box>

          {/* Stats */}
          <Box component="section" aria-label="Key stats" sx={{ py: { xs: 4, md: 5 } }}>
            <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
              <Grid container spacing={2}>
                {STATS.map((stat, i) => (
                  <Grid key={stat.label} size={{ xs: 12, sm: 4 }}>
                    <Box
                      sx={{
                        p: { xs: 2.5, md: 3 },
                        borderRadius: 3,
                        border: `1px solid ${BRAND.border}`,
                        bgcolor: alpha('#fff', 0.025),
                        textAlign: 'center',
                        transition: 'border-color 0.2s ease, transform 0.2s ease',
                        animation: `${fadeUp} 0.5s ease-out ${0.1 + i * 0.08}s both`,
                        '&:hover': {
                          borderColor: alpha(ACCENT, 0.35),
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: 'var(--font-geist-mono), monospace',
                          fontWeight: 800,
                          fontSize: { xs: '2rem', md: '2.5rem' },
                          letterSpacing: '-0.04em',
                          ...landing.gradientText,
                        }}
                      >
                        {stat.value}
                      </Typography>
                      <Typography sx={{ mt: 0.75, fontWeight: 700, fontSize: '0.9375rem' }}>{stat.label}</Typography>
                      <Typography sx={{ mt: 0.35, fontSize: '0.75rem', color: BRAND.textSubtle }}>{stat.desc}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Container>
          </Box>

          {/* How it works */}
          <Box id="how" component="section" sx={{ py: landing.sectionPy, scrollMarginTop: landing.scrollMargin }}>
            <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
              <Grid container spacing={{ xs: 5, md: 8 }} sx={{ alignItems: 'flex-start' }}>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Typography sx={landing.sectionLabel}>How it works</Typography>
                  <Typography variant="h4" sx={{ ...landing.heading, mt: 2, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
                    Up and running in three steps
                  </Typography>
                  <Typography sx={{ mt: 2, ...landing.body, maxWidth: 380 }}>
                    From first deposit to your first cross-border send — the entire flow takes minutes, not days.
                  </Typography>
                  <Button
                    component={Link}
                    href="/signup?next=/dashboard"
                    endIcon={<ArrowRight size={16} />}
                    sx={{ mt: 3, display: { xs: 'none', md: 'inline-flex' }, ...landing.secondaryCta }}
                  >
                    Get started free
                  </Button>
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                  <Stack spacing={0}>
                    {STEPS.map((item, i) => (
                      <Box
                        key={item.step}
                        sx={{
                          display: 'flex',
                          gap: 2.5,
                          pb: i < STEPS.length - 1 ? 3.5 : 0,
                          position: 'relative',
                          animation: `${fadeUp} 0.55s ease-out ${0.08 + i * 0.07}s both`,
                          '&::before':
                            i < STEPS.length - 1
                              ? {
                                  content: '""',
                                  position: 'absolute',
                                  left: 19,
                                  top: 42,
                                  bottom: 0,
                                  width: 2,
                                  bgcolor: alpha(ACCENT, 0.18),
                                }
                              : {},
                        }}
                      >
                        <Box
                          sx={{
                            flexShrink: 0,
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: BRAND.accentMuted,
                            border: `1px solid ${BRAND.accentBorder}`,
                            fontFamily: 'var(--font-geist-mono), monospace',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            color: ACCENT,
                          }}
                        >
                          {item.step}
                        </Box>
                        <Box sx={{ pt: 0.35 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '1.0625rem' }}>{item.title}</Typography>
                          <Typography sx={{ mt: 0.65, ...landing.body }}>{item.desc}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Grid>
              </Grid>
            </Container>
          </Box>

          <LandingUseCases />
          <LandingComparison />
          <LandingFeatures />

          <LandingFaq />

          {/* CTA */}
          <Box component="section" sx={{ py: landing.sectionPy, px: { xs: 2, sm: 3 } }}>
            <Container maxWidth="lg">
              <Box
                sx={{
                  position: 'relative',
                  borderRadius: 4,
                  border: `1px solid ${BRAND.accentBorder}`,
                  background: `
                    radial-gradient(ellipse 60% 80% at 0% 50%, ${alpha(ACCENT, 0.12)} 0%, transparent 60%),
                    radial-gradient(ellipse 50% 60% at 100% 50%, ${alpha(ACCENT, 0.06)} 0%, transparent 55%),
                    ${alpha('#fff', 0.03)}
                  `,
                  overflow: 'hidden',
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
                  alignItems: 'center',
                  gap: { xs: 3, md: 6 },
                  p: { xs: 4, md: 6 },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 1,
                    background: `linear-gradient(90deg, transparent 10%, ${ACCENT} 50%, transparent 90%)`,
                    opacity: 0.7,
                  },
                }}
              >
                <Box>
                  <Typography
                    variant="h5"
                    sx={{ ...landing.heading, fontSize: { xs: '1.5rem', md: '1.875rem' }, lineHeight: 1.2 }}
                  >
                    Ready to move money
                    <Box component="span" sx={{ display: 'block', ...landing.gradientText }}>
                      on your terms?
                    </Box>
                  </Typography>
                  <Typography sx={{ mt: 1.5, color: BRAND.textMuted, maxWidth: 480, lineHeight: 1.7, fontSize: '1rem' }}>
                    Become an early user — send across Africa, hold dollars, and get paid. Free to start, ready in minutes.
                  </Typography>
                </Box>
                <Stack spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' }, minWidth: { md: 220 } }}>
                  <Button
                    component={Link}
                    href="/signup?next=/dashboard"
                    variant="contained"
                    size="large"
                    endIcon={<ArrowRight size={18} />}
                    sx={{ ...landing.primaryCta, py: 1.6, fontSize: '1rem' }}
                  >
                    Open free account
                  </Button>
                  <Button component={Link} href="/login" sx={landing.ghostCta}>
                    I already have an account
                  </Button>
                </Stack>
              </Box>
            </Container>
          </Box>
        </Box>

        <Box id="contact" component="footer" sx={{ borderTop: `1px solid ${BRAND.border}`, py: { xs: 5, md: 7 }, scrollMarginTop: landing.scrollMargin }}>
          <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, sm: 6, md: 5 }}>
                <Logo iconOnly={false} size="md" variant="neon" className="text-white" />
                <Typography variant="body2" sx={{ mt: 2, color: alpha('#fff', 0.45), maxWidth: 320, lineHeight: 1.7 }}>
                  The dollar wallet for Africa. Send, save, and get paid with mobile money on-ramps, non-custodial security, and Stellar-speed transfers.
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3, md: 3.5 }}>
                <Typography sx={{ ...landing.sectionLabel, mb: 2 }}>Product</Typography>
                <Stack spacing={1.25}>
                  {FOOTER_PRODUCT.map((link) => (
                    <MuiLink
                      key={link.label}
                      component={Link}
                      href={link.href}
                      underline="none"
                      sx={{ color: alpha('#fff', 0.5), fontSize: '0.875rem', fontWeight: 500, '&:hover': { color: ACCENT } }}
                    >
                      {link.label}
                    </MuiLink>
                  ))}
                </Stack>
              </Grid>
              <Grid size={{ xs: 6, sm: 3, md: 3.5 }}>
                <Typography sx={{ ...landing.sectionLabel, mb: 2 }}>Legal</Typography>
                <Stack spacing={1.25}>
                  <MuiLink component={Link} href="/terms" underline="none" sx={{ color: alpha('#fff', 0.5), fontSize: '0.875rem', fontWeight: 500, '&:hover': { color: '#fff' } }}>
                    Terms of Service
                  </MuiLink>
                  <MuiLink component={Link} href="/privacy" underline="none" sx={{ color: alpha('#fff', 0.5), fontSize: '0.875rem', fontWeight: 500, '&:hover': { color: '#fff' } }}>
                    Privacy Policy
                  </MuiLink>
                </Stack>
              </Grid>
            </Grid>
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 5, pt: 3.5, borderTop: `1px solid ${BRAND.border}`, color: alpha('#fff', 0.28) }}
            >
              © 2026 Stepay. All rights reserved.
            </Typography>
          </Container>
        </Box>
      </Box>

      <SupportFab />
      <CookieNotice />
    </Box>
  );
}
