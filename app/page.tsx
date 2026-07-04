'use client';

import Link from 'next/link';
import { useState } from 'react';
import { alpha, keyframes } from '@mui/material/styles';
import { ArrowRight } from 'lucide-react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import InputBase from '@mui/material/InputBase';
import MuiLink from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { LandingDashboardPreview } from '@/components/landing/LandingDashboardPreview';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { Shield, Smartphone, Zap } from 'lucide-react';

const ACCENT = BRAND.accent;
const BG = BRAND.bg;

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
`;

const glowPulse = keyframes`
  0%, 100% { opacity: 0.55; }
  50% { opacity: 0.85; }
`;

export default function LandingPage() {
  const [email, setEmail] = useState('');

  const signupHref = email.trim()
    ? `/signup?next=/dashboard&email=${encodeURIComponent(email.trim())}`
    : '/signup?next=/dashboard';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: BG,
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <Box
        aria-hidden
        sx={{
          pointerEvents: 'none',
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          background: `
            radial-gradient(ellipse 90% 55% at 72% -8%, ${alpha(ACCENT, 0.22)} 0%, transparent 55%),
            radial-gradient(ellipse 60% 40% at 15% 20%, ${alpha(ACCENT, 0.06)} 0%, transparent 50%),
            linear-gradient(145deg, ${alpha(ACCENT, 0.08)} 0%, transparent 42%),
            ${BG}
          `,
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '70%',
            height: '70%',
            background: `linear-gradient(125deg, transparent 40%, ${alpha(ACCENT, 0.12)} 50%, transparent 60%)`,
            transform: 'rotate(-12deg)',
            animation: `${glowPulse} 8s ease-in-out infinite`,
          },
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <LandingHeader />

        <Box component="main">
          {/* Hero */}
          <Box
            component="section"
            sx={{
              pt: { xs: 6, md: 10 },
              pb: { xs: 6, md: 8 },
              textAlign: 'center',
            }}
          >
            <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 } }}>
              <Box sx={{ animation: `${fadeUp} 0.7s ease-out both` }}>
                <Typography
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    lineHeight: 1.05,
                    fontSize: { xs: '2.35rem', sm: '3.25rem', md: '4rem' },
                    color: '#fff',
                  }}
                >
                  Mobile money in.
                  <br />
                  <Box component="span" sx={{ color: ACCENT }}>
                    Dollars out.
                  </Box>
                </Typography>

                <Typography
                  sx={{
                    mt: 2.5,
                    mx: 'auto',
                    maxWidth: 520,
                    fontSize: { xs: '1rem', sm: '1.125rem' },
                    lineHeight: 1.65,
                    color: alpha('#fff', 0.55),
                  }}
                >
                  Hold USDC and XLM, fund with MTN, Airtel, or Zamtel, and pay anyone by phone number — no bank account needed.
                </Typography>

                <Stack
                  sx={{
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 0,
                    mt: 4,
                    mx: 'auto',
                    maxWidth: 520,
                    p: 0.75,
                    borderRadius: 999,
                    bgcolor: alpha('#fff', 0.06),
                    border: `1px solid ${alpha('#fff', 0.1)}`,
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <InputBase
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    sx={{
                      flex: 1,
                      px: 2.5,
                      py: 1.5,
                      fontSize: '0.9375rem',
                      color: '#fff',
                      '& input::placeholder': { color: alpha('#fff', 0.35), opacity: 1 },
                    }}
                  />
                  <Button
                    component={Link}
                    href={signupHref}
                    endIcon={<ArrowRight size={18} />}
                    sx={{
                      borderRadius: 999,
                      px: 3,
                      py: 1.35,
                      bgcolor: ACCENT,
                      color: BRAND.accentContrast,
                      fontWeight: 800,
                      fontSize: '0.9375rem',
                      whiteSpace: 'nowrap',
                      boxShadow: `0 0 32px ${alpha(ACCENT, 0.35)}`,
                      '&:hover': { bgcolor: 'var(--brand-accent-hover)', boxShadow: `0 0 40px ${alpha(ACCENT, 0.5)}` },
                    }}
                  >
                    Create free wallet
                  </Button>
                </Stack>

                <Stack
                  sx={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    mt: 3.5,
                  }}
                >
                  {['MTN · Airtel · Zamtel', 'Pay by phone number', 'Free to start'].map((t, i) => (
                    <Box
                      key={t}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                      }}
                    >
                      {i > 0 && (
                        <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: alpha('#fff', 0.2), display: { xs: 'none', sm: 'block' } }} />
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 500,
                          color: alpha('#fff', 0.45),
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 999,
                          border: `1px solid ${alpha('#fff', 0.08)}`,
                          bgcolor: alpha('#fff', 0.03),
                          fontSize: '0.75rem',
                        }}
                      >
                        {t}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Container>
          </Box>

          {/* Dashboard preview */}
          <Box component="section" sx={{ pb: { xs: 8, md: 12 }, px: { xs: 2, sm: 3 }, perspective: '1200px' }}>
            <Container
              maxWidth="lg"
              sx={{
                animation: `${fadeUp} 0.85s ease-out 0.12s both`,
                transform: { md: 'rotateX(4deg) rotateY(-2deg)' },
                transformOrigin: 'center top',
                transition: 'transform 0.4s ease',
                '&:hover': { transform: { md: 'rotateX(2deg) rotateY(-1deg) scale(1.005)' } },
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: '-20%',
                    background: `radial-gradient(ellipse at center, ${alpha(ACCENT, 0.15)} 0%, transparent 65%)`,
                    pointerEvents: 'none',
                    zIndex: 0,
                  },
                }}
              >
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <LandingDashboardPreview />
                </Box>
              </Box>
            </Container>
          </Box>

          {/* How it works */}
          <Box component="section" sx={{ py: { xs: 8, md: 10 }, borderTop: `1px solid ${BRAND.border}` }}>
            <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
              <Box sx={{ textAlign: 'center', mb: 6 }}>
                <Typography sx={{ color: ACCENT, fontWeight: 700, letterSpacing: '0.2em', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  How it works
                </Typography>
                <Typography variant="h4" sx={{ mt: 2, fontWeight: 800, letterSpacing: '-0.03em' }}>
                  Up and running in minutes
                </Typography>
              </Box>
              <Grid container spacing={3}>
                {[
                  { step: '01', title: 'Create your wallet', desc: 'Sign up with email. Your keys stay on your device — we never hold your funds.' },
                  { step: '02', title: 'Add mobile money', desc: 'Deposit from MTN, Airtel, or Zamtel. Kwacha in, digital dollars in your wallet.' },
                  { step: '03', title: 'Send or cash out', desc: 'Pay someone by phone number, swap assets, or withdraw back to mobile money.' },
                ].map((item) => (
                  <Grid key={item.step} size={{ xs: 12, md: 4 }}>
                    <Stack spacing={2} sx={{ height: '100%', p: 3, borderRadius: 3, border: `1px solid ${BRAND.border}`, bgcolor: alpha('#fff', 0.02), transition: 'all 0.25s ease', '&:hover': { borderColor: alpha(ACCENT, 0.3), bgcolor: alpha('#fff', 0.035), transform: 'translateY(-2px)' } }}>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.875rem', color: ACCENT }}>
                        {item.step}
                      </Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: '1.125rem' }}>{item.title}</Typography>
                      <Typography sx={{ color: BRAND.textMuted, lineHeight: 1.7, fontSize: '0.9375rem' }}>{item.desc}</Typography>
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </Container>
          </Box>

          {/* About / features — dark cards */}
          <Box id="about" component="section" sx={{ py: { xs: 8, md: 12 }, scrollMarginTop: 88 }}>
            <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
              <Box sx={{ textAlign: 'center', mb: 6 }}>
                <Typography sx={{ color: ACCENT, fontWeight: 700, letterSpacing: '0.2em', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  Why Stepay
                </Typography>
                <Typography variant="h4" sx={{ mt: 2, fontWeight: 800, letterSpacing: '-0.03em' }}>
                  Built for how Africa moves money
                </Typography>
              </Box>
              <Grid container spacing={2.5}>
                {[
                  { title: 'Fund with mobile money', desc: 'Top up from the networks you already use. No bank account, no branch visits.', icon: Smartphone },
                  { title: 'Settles in seconds', desc: 'Stellar-powered transfers with near-zero fees and confirmation in about five seconds.', icon: Zap },
                  { title: 'You hold the keys', desc: 'Non-custodial by design. Your wallet, your crypto — we can\'t move it without you.', icon: Shield },
                ].map(({ title, desc, icon: Icon }) => (
                  <Grid key={title} size={{ xs: 12, md: 4 }}>
                    <Box
                      sx={{
                        height: '100%',
                        p: 3,
                        borderRadius: 3,
                        border: `1px solid ${BRAND.border}`,
                        bgcolor: alpha('#fff', 0.03),
                        transition: 'border-color 0.25s, transform 0.25s',
                        '&:hover': {
                          borderColor: alpha(ACCENT, 0.35),
                          transform: 'translateY(-4px)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          mb: 2,
                          borderRadius: 2.5,
                          bgcolor: BRAND.accentMuted,
                          border: `1px solid ${alpha(ACCENT, 0.2)}`,
                          display: 'grid',
                          placeItems: 'center',
                          color: ACCENT,
                        }}
                      >
                        <Icon size={22} strokeWidth={2} />
                      </Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>{title}</Typography>
                      <Typography sx={{ mt: 1.25, color: BRAND.textMuted, lineHeight: 1.7, fontSize: '0.9375rem' }}>
                        {desc}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Container>
          </Box>

          {/* CTA strip */}
          <Box
            component="section"
            sx={{
              py: { xs: 8, md: 10 },
              borderTop: `1px solid ${alpha('#fff', 0.06)}`,
              background: `linear-gradient(180deg, transparent 0%, ${alpha(ACCENT, 0.06)} 100%)`,
            }}
          >
            <Container maxWidth="sm" sx={{ textAlign: 'center', px: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
                Start moving money on your terms
              </Typography>
              <Typography sx={{ mt: 2, color: alpha('#fff', 0.5) }}>
                Free account · No bank required · Set up in under 60 seconds
              </Typography>
              <Button
                component={Link}
                href="/signup?next=/dashboard"
                size="large"
                endIcon={<ArrowRight size={18} />}
                sx={{
                  mt: 3.5,
                  borderRadius: 999,
                  px: 4,
                  py: 1.5,
                  bgcolor: ACCENT,
                  color: BRAND.accentContrast,
                  fontWeight: 800,
                  '&:hover': { bgcolor: BRAND.accentHover, boxShadow: `0 8px 32px ${alpha(ACCENT, 0.4)}` },
                }}
              >
                Create your wallet
              </Button>
            </Container>
          </Box>
        </Box>

        <Box
          id="contact"
          component="footer"
          sx={{
            borderTop: `1px solid ${alpha('#fff', 0.06)}`,
            py: 6,
            scrollMarginTop: 88,
          }}
        >
          <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
            <Stack sx={{ flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 3 }}>
              <Box>
                <Logo iconOnly={false} size="md" variant="neon" className="text-white" />
                <Typography variant="body2" sx={{ mt: 1.5, color: alpha('#fff', 0.45), maxWidth: 320 }}>
                  Digital dollars for mobile money users. Deposit, send, and cash out — powered by Stellar.
                </Typography>
              </Box>
              <Stack sx={{ flexDirection: 'row', gap: 3 }}>
                <MuiLink component={Link} href="/terms" underline="none" sx={{ color: alpha('#fff', 0.45), fontSize: '0.875rem', '&:hover': { color: '#fff' } }}>
                  Terms
                </MuiLink>
                <MuiLink component={Link} href="/privacy" underline="none" sx={{ color: alpha('#fff', 0.45), fontSize: '0.875rem', '&:hover': { color: '#fff' } }}>
                  Privacy
                </MuiLink>
              </Stack>
            </Stack>
            <Typography variant="caption" sx={{ display: 'block', mt: 4, color: alpha('#fff', 0.3) }}>
              © 2026 Stepay. All rights reserved.
            </Typography>
          </Container>
        </Box>
      </Box>
    </Box>
  );
}
