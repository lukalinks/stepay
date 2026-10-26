'use client';

import Link from 'next/link';
import { alpha, keyframes } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowRight } from 'lucide-react';
import {
  DepositMock,
  MerchantMock,
  RequestMock,
  SecurityMock,
  SendMock,
  WalletMock,
} from '@/components/landing/LandingFeatureMocks';
import { BRAND } from '@/lib/brand';
import { landing } from '@/lib/landing-ui';

const ACCENT = BRAND.accent;

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const FEATURES = [
  {
    label: 'Cross-border sends',
    title: 'Pay anyone by phone number',
    desc: 'Send USDC to family, friends, or suppliers across Africa. Recipients are matched by mobile number — transfers settle in seconds on Stellar.',
    mock: <SendMock />,
    href: '/signup?next=/dashboard/send',
    cta: 'Try sending',
  },
  {
    label: 'Dollar savings',
    title: 'Hold USDC in your wallet',
    desc: 'Top up with mobile money and keep dollar assets in one place. Track your balance, swap between USDC and XLM, and watch portfolio value in local currency.',
    mock: <WalletMock />,
    href: '/signup?next=/dashboard',
    cta: 'Open your wallet',
  },
  {
    label: 'Mobile money deposit',
    title: 'Top up from your phone',
    desc: 'Deposit local currency via MTN, Airtel, or other mobile money networks. Funds convert to USDC and land in your wallet within minutes.',
    mock: <DepositMock />,
    href: '/signup?next=/dashboard/buy',
    cta: 'Make a deposit',
  },
  {
    label: 'Merchant payments',
    title: 'Accept payments with a link or QR',
    desc: 'Create checkout links for fixed amounts — school fees, café orders, online sales. Customers pay in seconds; you receive USDC directly.',
    mock: <MerchantMock />,
    href: '/signup?next=/dashboard/merchant',
    cta: 'Set up payments',
  },
  {
    label: 'Freelancer invoicing',
    title: 'Invoice clients with a payment link',
    desc: 'Set an amount, add a note, and share the link on WhatsApp or email. Clients pay on Stepay; you hold dollars or cash out locally.',
    mock: <RequestMock />,
    href: '/signup?next=/dashboard/request',
    cta: 'Create an invoice',
  },
  {
    label: 'Wallet security',
    title: 'Your keys, your funds',
    desc: 'Stepay is non-custodial. Private keys live on your device, with optional cloud backup. Export your secret key anytime — we never hold your money.',
    mock: <SecurityMock />,
    href: '/signup?next=/dashboard/settings',
    cta: 'Learn about security',
  },
];

export function LandingFeatures() {
  return (
    <Box
      id="about"
      component="section"
      sx={{
        py: landing.sectionPy,
        scrollMarginTop: landing.scrollMargin,
        borderTop: `1px solid ${BRAND.border}`,
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: { xs: 6, md: 8 }, maxWidth: 560, textAlign: { xs: 'center', md: 'left' }, mx: { xs: 'auto', md: 0 } }}>
          <Typography sx={landing.sectionLabel}>Features</Typography>
          <Typography variant="h4" sx={{ ...landing.heading, mt: 2, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
            See the app in action
          </Typography>
          <Typography sx={{ mt: 2, ...landing.body }}>
            Each screen mirrors the actual dashboard — send, deposit, invoice, merchant checkout, and wallet security.
          </Typography>
        </Box>

        <Stack spacing={{ xs: 8, md: 12 }}>
          {FEATURES.map((feature, i) => {
            const reversed = i % 2 === 1;
            return (
              <Grid
                key={feature.label}
                container
                spacing={{ xs: 4, md: 6 }}
                sx={{
                  alignItems: 'center',
                  animation: `${fadeUp} 0.6s ease-out ${0.05 + i * 0.04}s both`,
                }}
              >
                <Grid
                  size={{ xs: 12, md: 6 }}
                  sx={{ order: { xs: 1, md: reversed ? 2 : 1 } }}
                >
                  <Typography sx={landing.sectionLabel}>{feature.label}</Typography>
                  <Typography
                    sx={{
                      ...landing.heading,
                      mt: 2,
                      fontSize: { xs: '1.375rem', md: '1.75rem' },
                      lineHeight: 1.2,
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography sx={{ mt: 2, ...landing.body, maxWidth: 440 }}>{feature.desc}</Typography>
                  <Button
                    component={Link}
                    href={feature.href}
                    endIcon={<ArrowRight size={15} />}
                    sx={{ mt: 3, ...landing.secondaryCta, fontSize: '0.8125rem' }}
                  >
                    {feature.cta}
                  </Button>
                </Grid>

                <Grid
                  size={{ xs: 12, md: 6 }}
                  sx={{ order: { xs: 0, md: reversed ? 1 : 2 } }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      display: 'flex',
                      justifyContent: 'center',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: '10% 5%',
                        background: `radial-gradient(ellipse at center, ${alpha(ACCENT, 0.14)} 0%, transparent 70%)`,
                        pointerEvents: 'none',
                      },
                    }}
                  >
                    {feature.mock}
                  </Box>
                </Grid>
              </Grid>
            );
          })}
        </Stack>
      </Container>
    </Box>
  );
}
