'use client';

import Link from 'next/link';
import { Logo } from './Logo';

interface HeaderProps {
  /** Right-side content (e.g. nav links, menu button) */
  right?: React.ReactNode;
  /** Show "← Back" link (for secondary pages) */
  showBack?: boolean;
  /** Max width of inner content: 'full' | 'content' | 'narrow' */
  maxWidth?: 'full' | 'content' | 'narrow';
  /** Logo size */
  logoSize?: 'sm' | 'md' | 'lg';
  /** Optional class for logo (e.g. text-xl for larger wordmark) */
  logoClassName?: string;
  className?: string;
}

export function Header({
  right,
  showBack = false,
  maxWidth = 'full',
  logoSize = 'md',
  logoClassName = '',
  className = '',
}: HeaderProps) {
  const maxWidthClass = {
    full: 'max-w-7xl',
    content: 'max-w-5xl',
    narrow: 'max-w-3xl',
  }[maxWidth];

  return (
    <header
      className={`sticky top-0 z-40 border-b border-slate-200/60 bg-white/95 backdrop-blur-xl ${className}`}
    >
      <div
        className="flex min-h-14 items-center justify-between gap-4 px-4 pb-3 sm:min-h-16 sm:px-6 sm:pb-4"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className={`flex flex-1 items-center justify-between gap-4 ${maxWidthClass} w-full mx-auto`}>
          <Link
            href="/"
            className={`flex min-h-10 min-w-10 -m-2 items-center justify-center rounded-xl text-slate-900 transition-opacity hover:opacity-80 active:opacity-90 ${logoClassName}`}
          >
            <Logo iconOnly={false} size={logoSize} variant="light" />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            {showBack && (
              <Link
                href="/"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-teal-600 active:bg-slate-100"
              >
                ← Back
              </Link>
            )}
            {right}
          </div>
        </div>
      </div>
    </header>
  );
}
