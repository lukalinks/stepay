'use client';

interface LogoProps {
  /** Icon only (no wordmark) */
  iconOnly?: boolean;
  /** Size: sm (24px), md (32px), lg (40px) */
  size?: 'sm' | 'md' | 'lg';
  /** For dark backgrounds (sidebar, footer) */
  variant?: 'light' | 'dark' | 'neon';
  className?: string;
}

const sizes = { sm: 24, md: 32, lg: 40 };

export function Logo({ iconOnly = false, size = 'md', variant = 'light', className = '' }: LogoProps) {
  const s = sizes[size];

  const iconColors =
    variant === 'neon'
      ? { bar1: '#A8894A', bar2: '#C9A962', bar3: '#F0E6D0' }
      : variant === 'dark'
        ? { bar1: '#8B7344', bar2: '#C9A962', bar3: '#F0E6D0' }
        : { bar1: '#A8894A', bar2: '#C9A962', bar3: '#DFC484' };

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={s}
        height={s}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden
      >
        {/* Ascending stepped bars – Step + Pay brand mark */}
        <rect x="6" y="24" width="12" height="6" rx="2" fill={iconColors.bar1} />
        <rect x="10" y="16" width="16" height="6" rx="2" fill={iconColors.bar2} />
        <rect x="14" y="8" width="20" height="6" rx="2" fill={iconColors.bar3} />
      </svg>
      {!iconOnly && (
        <span className="font-bold tracking-tight font-heading text-inherit whitespace-nowrap">
          Stepay
        </span>
      )}
    </span>
  );
}
