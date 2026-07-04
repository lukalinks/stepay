'use client';

import { createTheme } from '@mui/material/styles';

export function createStepayTheme() {
  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#C9A962',
        dark: '#A8894A',
        light: '#DFC484',
        contrastText: '#0C0A06',
      },
      secondary: {
        main: '#d97706',
        dark: '#b45309',
        light: '#fbbf24',
        contrastText: '#ffffff',
      },
      background: {
        default: '#fafaf9',
        paper: '#ffffff',
      },
      text: {
        primary: '#0f172a',
        secondary: '#64748b',
      },
      divider: 'rgba(148, 163, 184, 0.35)',
      success: { main: '#059669' },
      error: { main: '#dc2626' },
      warning: { main: '#d97706' },
    },
    typography: {
      fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h1: { fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 },
      h2: { fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
      h3: { fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.25 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollBehavior: 'smooth',
            WebkitTapHighlightColor: 'transparent',
            backgroundColor: '#050505',
            color: '#fff',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 12, paddingInline: 20, paddingBlock: 10, minHeight: 44 },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined' },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: '1px',
            },
          },
          notchedOutline: {
            borderWidth: '1px',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });
}
