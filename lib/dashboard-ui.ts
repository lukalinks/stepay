/** Tailwind design tokens — dashboard (dark + champagne gold, premium). */
export const dash = {
    /** Layout */
    contentMax: 'max-w-[1280px] mx-auto w-full',
    sectionGap: 'space-y-4 sm:space-y-5',
    pageWrap: 'w-full min-w-0 overflow-x-hidden',

    /** Surfaces */
    panel:
        'rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/95 shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition-shadow duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.5)]',
    panelInset: 'rounded-xl border border-white/[0.06] bg-[#121212]',
    balanceHero:
        'relative overflow-hidden rounded-2xl border border-[var(--brand-accent-border)] bg-gradient-to-br from-[#161616] via-[#121212] to-[#0c0c0c] p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_40px_rgba(0,0,0,0.35)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[var(--brand-accent)]/50 before:to-transparent',
    actionTile:
        'group relative flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.045] to-transparent transition-all duration-200 hover:border-[var(--brand-accent-border)] hover:shadow-[0_4px_24px_var(--brand-accent-subtle)] hover:-translate-y-px active:scale-[0.98]',
    panelPadding: 'p-4 sm:p-5',

    /** Typography */
    pageTitle: 'text-xl sm:text-[1.375rem] font-bold text-white tracking-tight font-heading',
    pageSubtitle: 'mt-0.5 text-sm text-white/50 max-w-xl',
    sectionLabel: 'text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-white/35',
    sectionTitle: 'text-sm font-bold text-white tracking-tight font-heading',
    heading: 'text-base font-bold text-white tracking-tight font-heading',
    label: 'block text-sm font-medium text-white/65',
    hint: 'text-xs text-white/40 mt-0.5',
    formError: 'rounded-lg border border-red-500/15 bg-red-500/[0.06] px-3 py-2 text-sm text-red-300/90',
    formWarning:
        'rounded-lg border border-[var(--brand-accent-border)] bg-[var(--brand-accent-subtle)] px-3 py-2 text-sm text-[var(--brand-accent)]',

    /** Form controls — 44px min touch target on mobile */
    input:
        'w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-[40px] rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-base sm:text-sm hover:border-white/[0.14] focus:border-[var(--brand-accent)] focus:ring-1 focus:ring-[var(--brand-accent-ring)] outline-none transition-all placeholder:text-white/25',
    select:
        'w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-[40px] rounded-xl border border-white/[0.08] bg-[#121212] text-white text-base sm:text-sm hover:border-white/[0.14] focus:border-[var(--brand-accent)] focus:ring-1 focus:ring-[var(--brand-accent-ring)] outline-none transition-all',
    phoneGroup:
        'flex rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden hover:border-white/[0.14] focus-within:border-[var(--brand-accent)] focus-within:ring-1 focus-within:ring-[var(--brand-accent-ring)]',
    phonePrefix:
        'inline-flex items-center px-3 py-2.5 min-h-[44px] sm:min-h-[40px] text-white/45 bg-white/[0.04] border-r border-white/[0.08] text-sm font-medium shrink-0',
    phoneInput:
        'flex-1 px-3 py-2.5 min-h-[44px] sm:min-h-[40px] border-0 bg-transparent text-white text-base sm:text-sm focus:ring-0 focus:outline-none placeholder:text-white/25',

    /** Buttons */
    cta:
        'inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[40px] px-5 rounded-full bg-[var(--brand-accent)] text-[var(--brand-accent-contrast)] text-sm font-bold shadow-[0_4px_20px_var(--brand-accent-muted)] hover:bg-[var(--brand-accent-hover)] hover:shadow-[0_6px_28px_var(--brand-accent-glow)] active:scale-[0.98] transition-all disabled:opacity-60',
    ctaFull:
        'w-full min-h-[48px] sm:min-h-[44px] py-3 sm:py-2.5 rounded-full bg-[var(--brand-accent)] text-[var(--brand-accent-contrast)] text-sm font-bold shadow-[0_4px_20px_var(--brand-accent-muted)] hover:bg-[var(--brand-accent-hover)] hover:shadow-[0_6px_28px_var(--brand-accent-glow)] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2',
    ctaSecondary:
        'inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[40px] px-4 rounded-full border border-white/[0.12] bg-white/[0.04] text-white text-sm font-semibold hover:bg-white/[0.08] hover:border-white/[0.18] active:scale-[0.98] transition-all',
    ctaGhost:
        'inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[36px] px-3 rounded-full text-sm font-semibold text-[var(--brand-accent)] hover:bg-[var(--brand-accent-subtle)] active:bg-[var(--brand-accent-muted)] transition-colors',

    /** Cards & lists */
    card: 'rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/95 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)]',
    cardHeader:
        'flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent',
    cardTitle: 'font-semibold text-white text-sm tracking-tight',
    cardSubtitle: 'text-xs text-white/40 mt-0.5',
    statCard:
        'rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-3.5 flex flex-col gap-0.5 min-h-[80px]',
    statLabel: 'text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-white/40',
    statValue: 'text-2xl sm:text-[1.75rem] font-bold text-white tabular-nums tracking-tight',
    statMeta: 'text-xs font-medium text-[var(--brand-accent)]',

    /** Misc */
    iconBadge: 'flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-accent-muted)] text-[var(--brand-accent)] ring-1 ring-[var(--brand-accent-border)]',
    accentLink: 'text-[var(--brand-accent)] hover:text-[var(--brand-accent-hover)] font-semibold transition-colors',
    spinner: 'h-8 w-8 animate-spin text-[var(--brand-accent)]',
    divider: 'border-t border-white/[0.06]',
    emptyIcon: 'mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06]',
    errorPanel:
        'rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-8 text-center max-w-md mx-auto shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
    skeleton: 'skeleton-shimmer rounded-2xl',
    successIcon:
        'mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-accent-muted)] text-[var(--brand-accent)] ring-1 ring-[var(--brand-accent-border)]',
    holdingRow:
        'flex items-center justify-between rounded-xl border border-white/[0.06] bg-gradient-to-r from-white/[0.03] to-transparent px-3.5 py-2.5 transition-colors hover:border-white/[0.1] hover:from-white/[0.04]',
} as const;

export const PAGE_META: Record<string, { title: string; subtitle: string }> = {
    '/dashboard': {
        title: 'Overview',
        subtitle: 'Wallet balance, assets, and quick transfers.',
    },
    '/dashboard/buy': {
        title: 'Deposit',
        subtitle: 'Convert mobile money to XLM or USDC in your wallet.',
    },
    '/dashboard/sell': {
        title: 'Cash Out',
        subtitle: 'Withdraw crypto to your mobile money account.',
    },
    '/dashboard/send': {
        title: 'Phone Pay',
        subtitle: 'Send USDC or XLM to any mobile number across Africa.',
    },
    '/dashboard/request': {
        title: 'Request money',
        subtitle: 'Ask someone to pay you via link or WhatsApp.',
    },
    '/dashboard/swap': {
        title: 'Swap',
        subtitle: 'Exchange XLM and USDC in your wallet.',
    },
    '/dashboard/transactions': {
        title: 'Transactions',
        subtitle: 'Full history of deposits, withdrawals, and sends.',
    },
    '/dashboard/profile': {
        title: 'Profile',
        subtitle: 'Your account details and verification info.',
    },
    '/dashboard/rates': {
        title: 'Rates',
        subtitle: 'Current buy and sell exchange rates.',
    },
    '/dashboard/merchant': {
        title: 'Merchant & API',
        subtitle: 'Payment links, embed buttons, and partner API for shops and schools.',
    },
};
