'use client';

import Link from 'next/link';
import { useState, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { alpha, keyframes } from '@mui/material/styles';
import { ArrowRight, Shield, Wallet, Zap, Lock, Smartphone, Globe, TrendingUp, Store, Briefcase } from 'lucide-react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import InputBase from '@mui/material/InputBase';
import MuiLink from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { LandingHeroVisual } from '@/components/landing/LandingHeroVisual';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { landing, landingGlowSx } from '@/lib/landing-ui';

const ACCENT = BRAND.accent;

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;

const TRUST_ITEMS = [
  { icon: Globe, label: 'Send across Africa' },
  { icon: Smartphone, label: 'Mobile money top-up' },
  { icon: Zap, label: 'Most transfers in ~5s' },
  { icon: Lock, label: 'Non-custodial wallet' },
];

const STEPS = [
  { step: '01', title: 'Open your account', desc: 'Sign up with email in under a minute. Your keys stay on your device.' },
  { step: '02', title: 'Add money', desc: 'Top up with mobile money. Local currency converts to USDC or XLM in your wallet.' },
  { step: '03', title: 'Send, save, or get paid', desc: 'Transfer across borders, hold dollar assets, invoice clients, or cash out to mobile money. All from one app.' },
];

const FEATURES = [
  {
    title: 'Send across Africa',
    desc: 'Pay anyone by phone number, whether family, friends, or suppliers in another country. Transfers typically settle in seconds, not days.',
    icon: Globe,
  },
  {
    title: 'Hold dollar assets',
    desc: 'Hold USDC and XLM in one wallet. Top up with mobile money, swap when you want exposure, and stay in control of your keys.',
    icon: TrendingUp,
  },
  {
    title: 'Accept payments',
    desc: 'Shops, schools, and online sellers share a payment link or QR code. Customers pay you in seconds, with no card terminal needed.',
    icon: Store,
  },
  {
    title: 'Built for freelancers',
    desc: 'Send an invoice link to clients anywhere. They pay you on Stepay; you hold dollars or cash out to mobile money when you need to.',
    icon: Briefcase,
  },
  {
    title: 'One wallet, every use case',
    desc: 'Deposit, send, swap, request money, and withdraw. Personal savings, side hustles, and business cash flow in one place.',
    icon: Wallet,
  },
  {
    title: 'Safe at every step',
    desc: 'Non-custodial by design. We never hold your funds. Only you can move your money.',
    icon: Shield,
  },
];

const STATS = [
  { value: '~5s', label: 'Typical settlement', short: 'Speed' },
  { value: '0', label: 'Hidden fees', short: 'Fees' },
  { value: '100%', label: 'You control keys', short: 'Control' },
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
  const [email, setEmail] = useState('');

  useEffect(() => {
    document.body.classList.add('dashboard-grain');
    return () => document.body.classList.remove('dashboard-grain');
  }, []);

  const signupHref = email.trim()
    ? `/signup?next=/dashboard&email=${encodeURIComponent(email.trim())}`
    : '/signup?next=/dashboard';

  const goSignup = () => {
    window.location.href = signupHref;
  };

  const onEmailKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      goSignup();
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BRAND.bg, color: '#fff', overflowX: 'hidden' }}>
      <Box aria-hidden sx={landingGlowSx} />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <LandingHeader />

        <Box component="main">
          {/* Hero */}
          <Box component="section" sx={{ pt: { xs: 4, md: 7 }, pb: { xs: 5, md: 9 } }}>
            <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
              <Grid container spacing={{ xs: 4, lg: 7 }} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, lg: 6 }} sx={{ order: { xs: 1, lg: 0 } }}>
                  <Box sx={{ animation: `${fadeUp} 0.6s ease-out both`, textAlign: { xs: 'center', lg: 'left' } }}>
                    <Typography
                      component="h1"
                      sx={{
                        ...landing.heading,
                        lineHeight: 1.08,
                        fontSize: { xs: '2.25rem', sm: '2.85rem', lg: '3.25rem' },
                      }}
                    >
                      Send, save & get paid
                      <Box component="span" sx={{ color: ACCENT, display: 'block' }}>
                        across Africa
                      </Box>
                    </Typography>

                    <Typography
                      sx={{
                        mt: 2,
                        maxWidth: 420,
                        mx: { xs: 'auto', lg: 0 },
                        fontSize: { xs: '1rem', sm: '1.0625rem' },
                        lineHeight: 1.65,
                        color: BRAND.textMuted,
                      }}
                    >
                      One wallet for personal transfers, savings, and getting paid. No bank account needed.
                    </Typography>

                    <Stack
                      component="form"
                      onSubmit={(e: FormEvent) => {
                        e.preventDefault();
                        goSignup();
                      }}
                      spacing={{ xs: 1, sm: 0 }}
                      sx={{
                        flexDirection: { xs: 'column', sm: 'row' },
                        mt: 3,
                        maxWidth: 460,
                        mx: { xs: 'auto', lg: 0 },
                        ...landing.emailCapture,
                      }}
                    >
                      <InputBase
                        type="email"
                        placeholder="you@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={onEmailKeyDown}
                        inputProps={{ 'aria-label': 'Email address' }}
                        sx={landing.emailInput}
                      />
                      <Button type="submit" variant="contained" endIcon={<ArrowRight size={18} />} sx={landing.primaryCta}>
                        Open free account
                      </Button>
                    </Stack>

                    <Typography sx={{ mt: 1.25, fontSize: '0.8125rem', color: alpha('#fff', 0.42), textAlign: { xs: 'center', lg: 'left' } }}>
                      Free to join.{' '}
                      <MuiLink component={Link} href="/login" sx={{ ...landing.accentLink, fontSize: 'inherit' }}>
                        Sign in
                      </MuiLink>
                    </Typography>
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

          {/* Trust bar */}
          <Box component="section" aria-label="Trust signals" sx={{ ...landing.dividerSection, py: { xs: 2.5, md: 3 } }}>
            <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
              <Stack
                direction="row"
                spacing={{ xs: 2, md: 4 }}
                sx={{ flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}
              >
                {TRUST_ITEMS.map(({ icon: Icon, label }) => (
                  <Stack key={label} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Icon size={16} color={ACCENT} strokeWidth={2.25} />
                    <Typography sx={{ fontSize: { xs: '0.6875rem', sm: '0.8125rem' }, color: alpha('#fff', 0.55), fontWeight: 500 }}>
                      {label}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Container>
          </Box>

          {/* Stats */}
          <Box component="section" aria-label="Key stats" sx={{ borderBottom: `1px solid ${BRAND.border}`, bgcolor: alpha('#fff', 0.02) }}>
            <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
              <Grid container>
                {STATS.map((stat, i) => (
                  <Grid
                    key={stat.label}
                    size={{ xs: 4 }}
                    sx={{
                      py: { xs: 2.75, md: 3.5 },
                      textAlign: 'center',
                      borderRight: i < STATS.length - 1 ? `1px solid ${BRAND.border}` : 'none',
                    }}
                  >
                    <Typography sx={{ ...landing.heading, fontSize: { xs: '1.375rem', md: '1.875rem' }, color: ACCENT }}>
                      {stat.value}
                    </Typography>
                    <Typography sx={{ mt: 0.5, fontSize: '0.6875rem', color: BRAND.textSubtle, textTransform: 'uppercase', letterSpacing: '0.08em', display: { xs: 'none', sm: 'block' } }}>
                      {stat.label}
                    </Typography>
                    <Typography sx={{ mt: 0.5, fontSize: '0.6875rem', color: BRAND.textSubtle, textTransform: 'uppercase', letterSpacing: '0.08em', display: { xs: 'block', sm: 'none' } }}>
                      {stat.short}
                    </Typography>
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
                  <Typography variant="h4" sx={{ ...landing.heading, mt: 2, fontSize: { xs: '1.75rem', md: '2.125rem' } }}>
                    Three steps. That&apos;s it.
                  </Typography>
                  <Typography sx={{ mt: 2, ...landing.body, maxWidth: 360 }}>
                    Whether you send to family, grow savings, invoice clients, or run a shop, the flow stays the same.
                  </Typography>
                  <Button component={Link} href="/signup?next=/dashboard" endIcon={<ArrowRight size={16} />} sx={{ mt: 3, display: { xs: 'none', md: 'inline-flex' }, ...landing.secondaryCta }}>
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

          {/* Features */}
          <Box
            id="about"
            component="section"
            sx={{
              py: landing.sectionPy,
              scrollMarginTop: landing.scrollMargin,
              bgcolor: alpha('#fff', 0.015),
              borderTop: `1px solid ${BRAND.border}`,
            }}
          >
            <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
              <Box sx={{ mb: { xs: 5, md: 6 }, maxWidth: 480 }}>
                <Typography sx={landing.sectionLabel}>Why Stepay</Typography>
                <Typography variant="h4" sx={{ ...landing.heading, mt: 2, fontSize: { xs: '1.75rem', md: '2.125rem' } }}>
                  Built for how Africa moves money
                </Typography>
                <Typography sx={{ mt: 2, ...landing.body, maxWidth: 520 }}>
                  Personal transfers, savings, freelancer payouts, and business payments in one wallet on Stellar.
                </Typography>
              </Box>

              <Grid container spacing={2}>
                {FEATURES.map(({ title, desc, icon: Icon }, i) => (
                  <Grid key={title} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Box
                      sx={{
                        height: '100%',
                        p: 2.75,
                        ...landing.panel,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        animation: `${fadeUp} 0.5s ease-out ${0.05 + i * 0.05}s both`,
                        '&:hover': {
                          borderColor: alpha(ACCENT, 0.38),
                          transform: 'translateY(-2px)',
                          boxShadow: `0 12px 40px ${alpha('#000', 0.3)}`,
                        },
                      }}
                    >
                      <Box sx={{ ...landing.iconBadge, mb: 1.75 }}>
                        <Icon size={22} strokeWidth={2} />
                      </Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>{title}</Typography>
                      <Typography sx={{ mt: 0.85, ...landing.body }}>{desc}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Container>
          </Box>

          <LandingFaq />

          {/* CTA */}
          <Box component="section" sx={{ py: landing.sectionPy, px: { xs: 2, sm: 3 } }}>
            <Container maxWidth="lg">
              <Box
                sx={{
                  position: 'relative',
                  borderRadius: 3,
                  border: `1px solid ${BRAND.accentBorder}`,
                  background: `linear-gradient(135deg, ${BRAND.accentSubtle} 0%, ${alpha('#fff', 0.04)} 45%, transparent 100%)`,
                  overflow: 'hidden',
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
                  alignItems: 'center',
                  gap: { xs: 2.5, md: 5 },
                  p: { xs: 3.5, md: 5 },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
                    opacity: 0.65,
                  },
                }}
              >
                <Box>
                  <Typography variant="h5" sx={{ ...landing.heading, fontSize: { xs: '1.35rem', md: '1.5rem' } }}>
                    Join Stepay today
                  </Typography>
                  <Typography sx={{ mt: 1.25, color: BRAND.textMuted, maxWidth: 480, lineHeight: 1.65 }}>
                    Send across Africa, hold dollars, or start accepting payments. Free to join and ready in minutes.
                  </Typography>
                </Box>
                <Stack spacing={1.25} sx={{ width: { xs: '100%', md: 'auto' } }}>
                  <Button component={Link} href="/signup?next=/dashboard" variant="contained" size="large" endIcon={<ArrowRight size={18} />} sx={landing.primaryCta}>
                    Open free account
                  </Button>
                  <Button component={Link} href="/login" sx={landing.ghostCta}>
                    Sign in instead
                  </Button>
                </Stack>
              </Box>
            </Container>
          </Box>
        </Box>

        <Box id="contact" component="footer" sx={{ borderTop: `1px solid ${BRAND.border}`, py: { xs: 5, md: 6 }, scrollMarginTop: landing.scrollMargin }}>
          <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, sm: 6, md: 5 }}>
                <Logo iconOnly={false} size="md" variant="neon" className="text-white" />
                <Typography variant="body2" sx={{ mt: 1.5, color: alpha('#fff', 0.45), maxWidth: 300, lineHeight: 1.65 }}>
                  Send, save, and get paid across Africa. Deposit, swap, invoice clients, and cash out. Powered by Stellar.
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3, md: 3.5 }}>
                <Typography sx={{ ...landing.sectionLabel, mb: 1.75 }}>Product</Typography>
                <Stack spacing={1}>
                  {FOOTER_PRODUCT.map((link) => (
                    <MuiLink key={link.label} component={Link} href={link.href} underline="none" sx={{ color: alpha('#fff', 0.5), fontSize: '0.875rem', '&:hover': { color: ACCENT } }}>
                      {link.label}
                    </MuiLink>
                  ))}
                </Stack>
              </Grid>
              <Grid size={{ xs: 6, sm: 3, md: 3.5 }}>
                <Typography sx={{ ...landing.sectionLabel, mb: 1.75 }}>Legal</Typography>
                <Stack spacing={1}>
                  <MuiLink component={Link} href="/terms" underline="none" sx={{ color: alpha('#fff', 0.5), fontSize: '0.875rem', '&:hover': { color: '#fff' } }}>
                    Terms
                  </MuiLink>
                  <MuiLink component={Link} href="/privacy" underline="none" sx={{ color: alpha('#fff', 0.5), fontSize: '0.875rem', '&:hover': { color: '#fff' } }}>
                    Privacy
                  </MuiLink>
                </Stack>
              </Grid>
            </Grid>
            <Typography variant="caption" sx={{ display: 'block', mt: 4.5, pt: 3.5, borderTop: `1px solid ${BRAND.border}`, color: alpha('#fff', 0.28) }}>
              © 2026 Stepay. All rights reserved.
            </Typography>
          </Container>
        </Box>
      </Box>
    </Box>
  );
}
