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
    q: 'Do I need a bank account?',
    a: 'No. Top up with mobile money from your phone and start sending or accepting payments in minutes.',
  },
  {
    q: 'Can I send money to other countries in Africa?',
    a: 'Yes. Send to anyone on Stepay by phone number. Cross-border transfers typically settle in seconds on the Stellar network.',
  },
  {
    q: 'Can I hold dollars in Stepay?',
    a: 'Yes. Hold USDC and XLM in your wallet and swap between them anytime. You control your keys at all times.',
  },
  {
    q: 'Can businesses and freelancers use Stepay?',
    a: 'Yes. Share a payment link or QR so customers and clients pay you directly. Great for shops, side projects, and remote work.',
  },
  {
    q: 'What can I hold in my wallet?',
    a: 'USDC and XLM. Assets you can send, swap, or cash out to mobile money.',
  },
  {
    q: 'Is Stepay custodial?',
    a: 'No. Your wallet keys stay on your device. Stepay cannot move your funds without you.',
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
        <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 5 } }}>
          <Typography sx={landing.sectionLabel}>FAQ</Typography>
          <Typography
            variant="h4"
            sx={{ ...landing.heading, mt: 2, fontSize: { xs: '1.5rem', md: '1.875rem' } }}
          >
            Questions before you sign up
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
