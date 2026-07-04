'use client';

import { alpha } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { BRAND } from '@/lib/brand';

type AuthAlertVariant = 'success' | 'error' | 'warning' | 'info';

const config: Record<AuthAlertVariant, { icon: typeof CheckCircle; border: string; bg: string; iconColor: string }> = {
  success: { icon: CheckCircle, border: alpha(BRAND.accent, 0.35), bg: BRAND.accentMuted, iconColor: BRAND.accent },
  error: { icon: AlertCircle, border: 'rgba(248, 113, 113, 0.35)', bg: 'rgba(248, 113, 113, 0.1)', iconColor: '#f87171' },
  warning: { icon: AlertTriangle, border: 'rgba(251, 191, 36, 0.35)', bg: 'rgba(251, 191, 36, 0.1)', iconColor: '#fbbf24' },
  info: { icon: Info, border: 'rgba(96, 165, 250, 0.35)', bg: 'rgba(96, 165, 250, 0.1)', iconColor: '#60a5fa' },
};

type AuthAlertProps = {
  variant?: AuthAlertVariant;
  title?: string;
  children: React.ReactNode;
};

/** Compact inline form error for auth — no icon box or generic title. */
export function AuthFormError({ children }: { children?: string | null }) {
  if (!children?.trim()) return null;
  return (
    <Box
      role="alert"
      sx={{
        borderRadius: 2,
        border: '1px solid rgba(248, 113, 113, 0.15)',
        bgcolor: 'rgba(248, 113, 113, 0.06)',
        px: 1.5,
        py: 1.25,
        fontSize: '0.875rem',
        lineHeight: 1.5,
        color: '#fca5a5',
      }}
    >
      {children}
    </Box>
  );
}

export function AuthAlert({ variant = 'warning', title, children }: AuthAlertProps) {
  const { icon: Icon, border, bg, iconColor } = config[variant];

  return (
    <Box
      role="alert"
      sx={{
        display: 'flex',
        gap: 1.5,
        p: 2,
        borderRadius: 2.5,
        border: `1px solid ${border}`,
        bgcolor: bg,
      }}
    >
      <Box sx={{ color: iconColor, pt: 0.25, flexShrink: 0 }}>
        <Icon size={20} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        {title && (
          <Box component="p" sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff', mb: 0.25 }}>
            {title}
          </Box>
        )}
        <Box component="p" sx={{ fontSize: '0.875rem', color: BRAND.textMuted, lineHeight: 1.55, m: 0 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

/** MUI Alert styled for dark auth success banners */
export function AuthSuccessBanner({ children }: { children: React.ReactNode }) {
  return (
    <Alert
      severity="success"
      sx={{
        borderRadius: 2.5,
        bgcolor: BRAND.accentMuted,
        color: BRAND.accentLight,
        border: `1px solid ${alpha(BRAND.accent, 0.3)}`,
        '& .MuiAlert-icon': { color: BRAND.accent },
      }}
    >
      {children}
    </Alert>
  );
}
