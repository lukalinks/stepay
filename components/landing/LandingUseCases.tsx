'use client';

import Link from 'next/link';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowRight, Briefcase, Heart, Store } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { landing } from '@/lib/landing-ui';

const ACCENT = BRAND.accent;

const USE_CASES = [
  {
    icon: Heart,
    tag: 'Personal',
    title: 'Send money home',
    desc: 'Pay family and friends across borders by phone number. No bank account, no waiting days for transfers to clear.',
    perks: ['~5 second settlement', 'Mobile money top-up & cash-out', 'Hold USDC between sends'],
    href: '/signup?next=/dashboard/send',
    cta: 'Start sending',
  },
  {
    icon: Briefcase,
    tag: 'Freelancers',
    title: 'Get paid globally',
    desc: 'Invoice clients anywhere with a payment link. Receive USDC instantly and cash out to mobile money when you need local currency.',
    perks: ['Payment request links', 'Hold dollar savings', 'No card terminal needed'],
    href: '/signup?next=/dashboard/request',
    cta: 'Create invoice link',
    featured: true,
  },
  {
    icon: Store,
    tag: 'Business',
    title: 'Accept payments',
    desc: 'Shops, schools, and online sellers share a QR code or link. Customers pay in seconds — you receive funds directly in your wallet.',
    perks: ['QR & payment links', 'Merchant dashboard', 'Developer API available'],
    href: '/signup?next=/dashboard/merchant',
    cta: 'Set up payments',
  },
];

export function LandingUseCases() {
  return (
    <Box
      id="use-cases"
      component="section"
      sx={{
        py: landing.sectionPy,
        scrollMarginTop: landing.scrollMargin,
        borderTop: `1px solid ${BRAND.border}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        aria-hidden
        sx={{
          pointerEvents: 'none',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80%',
          height: '60%',
          background: `radial-gradient(ellipse at center, ${alpha(ACCENT, 0.06)} 0%, transparent 70%)`,
        }}
      />

      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, position: 'relative' }}>
        <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 7 }, maxWidth: 560, mx: 'auto' }}>
          <Typography sx={landing.sectionLabel}>Use cases</Typography>
          <Typography
            variant="h4"
            sx={{ ...landing.heading, mt: 2, fontSize: { xs: '1.75rem', md: '2.25rem' } }}
          >
            One wallet, every way you move money
          </Typography>
          <Typography sx={{ mt: 2, ...landing.body }}>
            Whether you send to family, invoice clients, or run a shop — Stepay handles deposits, transfers, and payouts in one place.
          </Typography>
        </Box>

        <Grid container spacing={2.5}>
          {USE_CASES.map(({ icon: Icon, tag, title, desc, perks, href, cta, featured }) => (
            <Grid key={tag} size={{ xs: 12, md: 4 }}>
              <Box
                sx={{
                  height: '100%',
                  p: { xs: 3, md: 3.25 },
                  borderRadius: 3,
                  border: `1px solid ${featured ? BRAND.accentBorder : BRAND.border}`,
                  bgcolor: featured ? alpha(ACCENT, 0.06) : alpha('#fff', 0.025),
                  background: featured
                    ? `linear-gradient(160deg, ${alpha(ACCENT, 0.1)} 0%, ${alpha('#fff', 0.02)} 60%)`
                    : alpha('#fff', 0.025),
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease',
                  '&:hover': {
                    borderColor: alpha(ACCENT, 0.45),
                    transform: 'translateY(-4px)',
                    boxShadow: `0 20px 50px ${alpha('#000', 0.35)}`,
                  },
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
                  <Box sx={{ ...landing.iconBadge, width: 40, height: 40, borderRadius: 2 }}>
                    <Icon size={20} strokeWidth={2} />
                  </Box>
                  <Typography
                    sx={{
                      px: 1.25,
                      py: 0.35,
                      borderRadius: 999,
                      bgcolor: alpha('#fff', 0.06),
                      border: `1px solid ${BRAND.border}`,
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: alpha('#fff', 0.55),
                    }}
                  >
                    {tag}
                  </Typography>
                </Stack>

                <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
                  {title}
                </Typography>
                <Typography sx={{ mt: 1.25, ...landing.body, flex: 1 }}>{desc}</Typography>

                <Stack spacing={1.25} sx={{ mt: 2.5, mb: 3 }}>
                  {perks.map((perk) => (
                    <Stack key={perk} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                      <Box sx={landing.checkBadge}>
                        <Box
                          component="span"
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: ACCENT,
                            display: 'block',
                          }}
                        />
                      </Box>
                      <Typography sx={{ fontSize: '0.8125rem', color: alpha('#fff', 0.65), fontWeight: 500 }}>
                        {perk}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>

                <Button
                  component={Link}
                  href={href}
                  endIcon={<ArrowRight size={15} />}
                  sx={{
                    alignSelf: 'flex-start',
                    mt: 'auto',
                    ...landing.secondaryCta,
                    fontSize: '0.8125rem',
                  }}
                >
                  {cta}
                </Button>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
