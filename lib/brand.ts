/** Shared marketing / shell tokens (landing, auth sidebar, dashboard accent). */
export const BRAND = {
  /** Champagne gold — premium accent on dark surfaces */
  accent: '#C9A962',
  accentHover: '#DFC484',
  accentLight: '#F0E6D0',
  accentMuted: 'rgba(201, 169, 98, 0.14)',
  accentSubtle: 'rgba(201, 169, 98, 0.08)',
  accentBorder: 'rgba(201, 169, 98, 0.28)',
  accentGlow: 'rgba(201, 169, 98, 0.35)',
  accentContrast: '#0C0A06',
  bg: '#050505',
  surface: '#0a0a0a',
  surfaceRaised: '#121212',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',
  textMuted: 'rgba(255, 255, 255, 0.55)',
  textSubtle: 'rgba(255, 255, 255, 0.38)',
} as const;

export const glassCardSx = {
  borderRadius: { xs: 3, sm: 4 },
  border: `1px solid ${BRAND.borderStrong}`,
  bgcolor: 'rgba(255, 255, 255, 0.04)',
  backdropFilter: 'blur(24px)',
  boxShadow: `0 32px 80px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 0 0 1px rgba(201, 169, 98, 0.06)`,
};

export const authTextFieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    borderRadius: 2.5,
    bgcolor: 'rgba(255, 255, 255, 0.04)',
    '&.Mui-focused': { boxShadow: 'none' },
    '& fieldset, & .MuiOutlinedInput-notchedOutline': {
      borderColor: BRAND.border,
      borderWidth: '1px',
    },
    '&:hover fieldset, &:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: 'rgba(255, 255, 255, 0.18)',
    },
    '&.Mui-focused fieldset, &.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: `${BRAND.accent} !important`,
      borderWidth: '1px !important',
    },
  },
  '& .MuiOutlinedInput-input': {
    outline: 'none',
    '&:focus': { outline: 'none' },
    '&:focus-visible': { outline: 'none' },
  },
  '& .MuiInputLabel-root': { color: BRAND.textMuted },
  '& .MuiInputLabel-root.Mui-focused': { color: BRAND.accent },
  '& .MuiSelect-icon': { color: BRAND.textMuted },
  '& .MuiFormHelperText-root': { color: BRAND.textSubtle, mx: 0, mt: 0.75, lineHeight: 1.45 },
};

/** Dark dropdown for auth / profile selects (MUI Select MenuProps) */
export const authSelectMenuProps = {
  MenuProps: {
    slotProps: {
      paper: {
        sx: {
          bgcolor: '#141414',
          border: `1px solid ${BRAND.borderStrong}`,
          backgroundImage: 'none',
          mt: 0.5,
          maxHeight: 280,
          boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
          '& .MuiMenuItem-root': {
            color: '#fff',
            fontSize: '0.9375rem',
            py: 1.1,
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)' },
            '&.Mui-selected': {
              bgcolor: BRAND.accentMuted,
              '&:hover': { bgcolor: 'rgba(201, 169, 98, 0.18)' },
            },
          },
        },
      },
    },
  },
};

export const accentLinkSx = {
  fontWeight: 700,
  color: BRAND.accent,
  textDecoration: 'none',
  '&:hover': { color: BRAND.accentHover, textDecoration: 'underline' },
};

export const primaryCtaSx = {
  borderRadius: 999,
  py: 1.5,
  fontWeight: 800,
  fontSize: '1rem',
  bgcolor: BRAND.accent,
  color: BRAND.accentContrast,
  boxShadow: `0 0 28px ${BRAND.accentMuted}`,
  '&:hover': { bgcolor: BRAND.accentHover, boxShadow: `0 0 36px ${BRAND.accentGlow}` },
  '&.Mui-disabled': { bgcolor: 'rgba(201, 169, 98, 0.35)', color: 'rgba(0,0,0,0.5)' },
};
