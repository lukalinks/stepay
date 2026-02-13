'use client';

interface LogoProps {
  /** Icon only (no wordmark) */
  iconOnly?: boolean;
  /** Size: sm (24px), md (32px), lg (40px) */
  size?: 'sm' | 'md' | 'lg';
  /** For dark backgrounds (sidebar, footer) */
  variant?: 'light' | 'dark';
  className?: string;
}

const sizes = { sm: 24, md: 32, lg: 40 };

export function Logo({ iconOnly = false, size = 'md', variant = 'light', className = '' }: LogoProps) {
  const s = sizes[size];

  const iconColors = variant === 'dark'
    ? { bar1: '#2dd4bf', bar2: '#5eead4', bar3: '#f59e0b' }
    : { bar1: '#0d9488', bar2: '#14b8a6', bar3: '#d97706' };

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
