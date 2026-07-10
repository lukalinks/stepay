import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import { BRAND, primaryCtaSx, accentLinkSx } from '@/lib/brand';

const ACCENT = BRAND.accent;

/** Landing page tokens — aligned with lib/brand.ts + dashboard dark surfaces */
export const landing = {
  sectionPy: { xs: 7, md: 10 } as const,
  scrollMargin: 88,

  sectionLabel: {
    color: ACCENT,
    fontWeight: 700,
    letterSpacing: '0.18em',
    fontSize: '0.6875rem',
    textTransform: 'uppercase' as const,
  } satisfies SxProps<Theme>,

  heading: {
    fontWeight: 800,
    letterSpacing: '-0.03em',
    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
    color: '#fff',
  } satisfies SxProps<Theme>,

  body: {
    color: BRAND.textMuted,
    lineHeight: 1.75,
    fontSize: '0.9375rem',
  } satisfies SxProps<Theme>,

  badge: {
    display: 'inline-block',
    mb: 2.5,
    px: 1.75,
    py: 0.55,
    borderRadius: 999,
    border: `1px solid ${BRAND.accentBorder}`,
    bgcolor: BRAND.accentSubtle,
    color: ACCENT,
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
  } satisfies SxProps<Theme>,

  panel: {
    borderRadius: 2.5,
    border: `1px solid ${BRAND.border}`,
    bgcolor: alpha('#fff', 0.03),
    transition: 'border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
      borderColor: alpha(ACCENT, 0.32),
    },
  } satisfies SxProps<Theme>,

  panelAccent: {
    borderRadius: 2.5,
    border: `1px solid ${alpha(ACCENT, 0.22)}`,
    background: `linear-gradient(135deg, ${BRAND.accentSubtle} 0%, ${alpha('#fff', 0.03)} 100%)`,
  } satisfies SxProps<Theme>,

  emailCapture: {
    p: 0.75,
    borderRadius: 999,
    bgcolor: alpha('#fff', 0.05),
    border: `1px solid ${BRAND.borderStrong}`,
    backdropFilter: 'blur(12px)',
    boxShadow: `0 8px 32px ${alpha('#000', 0.35)}`,
  } satisfies SxProps<Theme>,

  emailInput: {
    flex: 1,
    px: 2.5,
    py: 1.5,
    fontSize: '0.9375rem',
    color: '#fff',
    minHeight: 44,
    '& input::placeholder': { color: alpha('#fff', 0.35), opacity: 1 },
  } satisfies SxProps<Theme>,

  primaryCta: {
    ...primaryCtaSx,
    fontSize: '0.9375rem',
    py: 1.35,
    px: 3,
    minHeight: 44,
    whiteSpace: 'nowrap' as const,
  } satisfies SxProps<Theme>,

  secondaryCta: {
    borderRadius: 999,
    px: 2.5,
    py: 1,
    minHeight: 44,
    bgcolor: BRAND.accentSubtle,
    color: ACCENT,
    fontWeight: 700,
    fontSize: '0.875rem',
    border: `1px solid ${BRAND.accentBorder}`,
    textTransform: 'none' as const,
    '&:hover': { bgcolor: alpha(ACCENT, 0.18) },
  } satisfies SxProps<Theme>,

  ghostCta: {
    borderRadius: 999,
    py: 1,
    minHeight: 44,
    color: alpha('#fff', 0.65),
    fontWeight: 600,
    textTransform: 'none' as const,
    '&:hover': { bgcolor: alpha('#fff', 0.05) },
  } satisfies SxProps<Theme>,

  accentLink: accentLinkSx satisfies SxProps<Theme>,

  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 2,
    bgcolor: BRAND.accentMuted,
    border: `1px solid ${alpha(ACCENT, 0.22)}`,
    display: 'grid',
    placeItems: 'center',
    color: ACCENT,
    flexShrink: 0,
  } satisfies SxProps<Theme>,

  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    bgcolor: BRAND.accentMuted,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  } satisfies SxProps<Theme>,

  dividerSection: {
    borderTop: `1px solid ${BRAND.border}`,
    borderBottom: `1px solid ${BRAND.border}`,
    bgcolor: alpha('#fff', 0.02),
  } satisfies SxProps<Theme>,
};

export const landingGlowSx = {
  pointerEvents: 'none' as const,
  position: 'fixed' as const,
  inset: 0,
  zIndex: 0,
  background: `
    radial-gradient(ellipse 70% 50% at 80% -10%, ${alpha(ACCENT, 0.18)} 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 10% 90%, ${alpha(ACCENT, 0.06)} 0%, transparent 50%),
    ${BRAND.bg}
  `,
};
