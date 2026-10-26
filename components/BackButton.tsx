'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { BRAND } from '@/lib/brand';

type BackButtonVariant = 'dark' | 'light' | 'ghost';

type BackButtonProps = {
  href?: string;
  onClick?: () => void;
  label?: string;
  /** dark = auth/dashboard; light = legal/white pages; ghost = subtle text+icon */
  variant?: BackButtonVariant;
  /** Accessible name when label is hidden */
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
};

const styles: Record<
  BackButtonVariant,
  {
    iconBg: string;
    iconBorder: string;
    iconColor: string;
    hoverBg: string;
    hoverBorder: string;
    labelColor: string;
    labelHover: string;
  }
> = {
  dark: {
    iconBg: alpha('#fff', 0.06),
    iconBorder: BRAND.borderStrong,
    iconColor: '#fff',
    hoverBg: alpha(BRAND.accent, 0.14),
    hoverBorder: BRAND.accentBorder,
    labelColor: alpha('#fff', 0.72),
    labelHover: '#fff',
  },
  light: {
    iconBg: '#fff',
    iconBorder: 'rgba(15, 23, 42, 0.1)',
    iconColor: '#0f172a',
    hoverBg: 'rgba(201, 169, 98, 0.12)',
    hoverBorder: 'rgba(201, 169, 98, 0.35)',
    labelColor: '#475569',
    labelHover: '#0f172a',
  },
  ghost: {
    iconBg: 'transparent',
    iconBorder: 'transparent',
    iconColor: BRAND.accent,
    hoverBg: BRAND.accentSubtle,
    hoverBorder: 'transparent',
    labelColor: BRAND.accent,
    labelHover: BRAND.accentHover,
  },
};

export function BackButton({
  href,
  onClick,
  label,
  variant = 'dark',
  ariaLabel,
  className,
  disabled,
}: BackButtonProps) {
  const s = styles[variant];
  const a11y = ariaLabel || label || 'Go back';

  const content = (
    <>
      <Box
        component="span"
        className="back-btn-icon"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: '999px',
          bgcolor: s.iconBg,
          border: `1px solid ${s.iconBorder}`,
          color: s.iconColor,
          transition: 'background 0.15s ease, border-color 0.15s ease, transform 0.15s ease',
          flexShrink: 0,
        }}
      >
        <ChevronLeft size={18} strokeWidth={2.25} />
      </Box>
      {label ? (
        <Typography
          component="span"
          className="back-btn-label"
          sx={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: s.labelColor,
            letterSpacing: '-0.01em',
            transition: 'color 0.15s ease',
          }}
        >
          {label}
        </Typography>
      ) : null}
    </>
  );

  const sx = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 1,
    minHeight: 44,
    px: label ? 0.5 : 0,
    py: 0.25,
    borderRadius: 999,
    textDecoration: 'none',
    color: 'inherit',
    opacity: disabled ? 0.5 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
    transition: 'opacity 0.15s ease',
    '&:hover .back-btn-icon': {
      bgcolor: s.hoverBg,
      borderColor: s.hoverBorder,
      transform: 'translateX(-1px)',
    },
    '&:hover .back-btn-label': {
      color: s.labelHover,
    },
    '&:active .back-btn-icon': {
      transform: 'translateX(-2px) scale(0.96)',
    },
  } as const;

  if (href) {
    const external = /^https?:\/\//i.test(href);
    return (
      <ButtonBase
        component={external ? 'a' : Link}
        href={href}
        aria-label={a11y}
        className={className}
        disableRipple
        sx={sx}
      >
        {content}
      </ButtonBase>
    );
  }

  return (
    <ButtonBase
      type="button"
      onClick={onClick}
      aria-label={a11y}
      className={className}
      disabled={disabled}
      disableRipple
      sx={sx}
    >
      {content}
    </ButtonBase>
  );
}
