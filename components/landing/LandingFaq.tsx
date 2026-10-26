'use client';

import { useState } from 'react';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { ChevronDown } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { landing } from '@/lib/landing-ui';

const FAQ = [
  {
    q: 'Do I need a bank account to use Stepay?',
    a: 'No. You can top up with mobile money directly from your phone and start sending or accepting payments within minutes. A bank account is never required.',
  },
  {
    q: 'How fast are cross-border transfers?',
    a: 'Transfers between Stepay users typically settle in around 5 seconds on the Stellar network — compared to 2–5 business days with traditional banks.',
  },
  {
    q: 'Can I hold US dollars in my wallet?',
    a: 'Yes. Hold USDC and XLM in your non-custodial wallet. Top up with mobile money, swap between assets anytime, and cash out when you need local currency.',
  },
  {
    q: 'Is Stepay safe? Who holds my money?',
    a: 'Stepay is non-custodial — your private keys stay on your device. We cannot access or move your funds. You are always in control.',
  },
  {
    q: 'Can businesses and freelancers use Stepay?',
    a: 'Absolutely. Share a payment link or QR code so customers and clients pay you directly. Ideal for shops, schools, side projects, and remote work.',
  },
  {
    q: 'How do I cash out to mobile money?',
    a: 'From your dashboard, choose Sell/Withdraw, enter the amount, and select your mobile money provider. Funds arrive on your phone typically within minutes.',
  },
];

function FaqItem({
  q,
  a,
  open,
  onToggle,
  isLast,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  return (
    <Box
      sx={{
        borderBottom: isLast ? 'none' : `1px solid ${BRAND.border}`,
        bgcolor: open ? alpha(BRAND.accent, 0.05) : 'transparent',
        transition: 'background-color 0.2s ease',
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          px: { xs: 2, sm: 2.5 },
          py: { xs: 2, sm: 2.25 },
          minHeight: 56,
          border: 'none',
          bgcolor: 'transparent',
          color: '#fff',
          cursor: 'pointer',
          textAlign: 'left',
          WebkitTapHighlightColor: 'transparent',
          '&:hover': { bgcolor: alpha('#fff', 0.03) },
          '&:focus-visible': {
            outline: `2px solid ${BRAND.accent}`,
            outlineOffset: -2,
          },
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: { xs: '0.875rem', sm: '0.9375rem' },
            lineHeight: 1.45,
            color: open ? '#fff' : alpha('#fff', 0.88),
            pr: 0.5,
          }}
        >
          {q}
        </Typography>
        <Box
          sx={{
            flexShrink: 0,
            mt: 0.25,
            width: 28,
            height: 28,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: open ? BRAND.accentMuted : alpha('#fff', 0.05),
            border: `1px solid ${open ? BRAND.accentBorder : BRAND.border}`,
            color: open ? BRAND.accent : alpha('#fff', 0.45),
            transition: 'all 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <ChevronDown size={16} strokeWidth={2.5} />
        </Box>
      </Box>

      <Collapse in={open} timeout={220}>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 0, pb: 2.5 }}>
          <Typography
            sx={{
              ...landing.body,
              fontSize: '0.875rem',
              lineHeight: 1.7,
              maxWidth: 560,
            }}
          >
            {a}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}

export function LandingFaq() {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <Box id="faq" component="section" sx={{ py: landing.sectionPy, scrollMarginTop: landing.scrollMargin }}>
      <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 } }}>
        <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 }, maxWidth: 480, mx: 'auto' }}>
          <Typography sx={landing.sectionLabel}>FAQ</Typography>
          <Typography
            variant="h4"
            sx={{ ...landing.heading, mt: 2, fontSize: { xs: '1.5rem', md: '2rem' } }}
          >
            Common questions
          </Typography>
          <Typography sx={{ mt: 1.5, ...landing.body, fontSize: '0.9375rem' }}>
            Everything you need to know before opening your wallet.
          </Typography>
        </Box>

        <Box
          sx={{
            borderRadius: 3,
            border: `1px solid ${BRAND.borderStrong}`,
            bgcolor: alpha('#fff', 0.03),
            overflow: 'hidden',
            boxShadow: `0 16px 48px ${alpha('#000', 0.25)}, inset 0 1px 0 ${alpha('#fff', 0.06)}`,
          }}
        >
          {FAQ.map(({ q, a }, i) => (
            <FaqItem
              key={q}
              q={q}
              a={a}
              open={expanded === i}
              isLast={i === FAQ.length - 1}
              onToggle={() => setExpanded(expanded === i ? null : i)}
            />
          ))}
        </Box>
      </Container>
    </Box>
  );
}
