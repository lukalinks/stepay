import Link from 'next/link';
import { ArrowDownLeft, ArrowDownUp, ArrowUpRight, History, Send, HandCoins } from 'lucide-react';
import { dash } from '@/lib/dashboard-ui';

const actions = [
    { href: '/dashboard/buy', label: 'Deposit', icon: ArrowDownLeft },
    { href: '/dashboard/swap', label: 'Swap', icon: ArrowDownUp },
    { href: '/dashboard/send', label: 'Phone Pay', icon: Send },
    { href: '/dashboard/request', label: 'Request', icon: HandCoins },
    { href: '/dashboard/sell', label: 'Cash Out', icon: ArrowUpRight },
    { href: '/dashboard/transactions', label: 'History', icon: History },
];

interface QuickActionsBarProps {
    variant?: 'horizontal' | 'vertical' | 'responsive';
    className?: string;
    compact?: boolean;
}

export function QuickActionsBar({ variant = 'horizontal', className = '', compact = false }: QuickActionsBarProps) {
    const isSidebar = variant === 'vertical' || variant === 'responsive';

    const gridClass =
        variant === 'responsive'
            ? `grid grid-cols-3 ${compact ? 'gap-1.5' : 'gap-2'} sm:grid-cols-6 lg:flex lg:flex-col lg:gap-2`
            : variant === 'vertical'
              ? 'flex flex-col gap-2'
              : `grid grid-cols-3 ${compact ? 'gap-1.5' : 'gap-2'} sm:grid-cols-6`;

    const linkClass = (sidebar: boolean) =>
        `${dash.actionTile} ${
            compact
                ? 'flex-col px-1.5 py-1.5 text-center min-h-[36px]'
                : sidebar
                  ? 'lg:flex-row lg:justify-start lg:px-3.5 lg:py-3 flex-col px-2 py-2.5 text-center lg:text-left'
                  : 'flex-col px-2 py-2.5 text-center sm:flex-row sm:px-3 sm:py-2.5 sm:text-left'
        }`;

    return (
        <div className={className}>
            {isSidebar && (
                <div className="mb-4 hidden lg:block">
                    <h2 className={dash.heading}>Quick actions</h2>
                    <p className={dash.hint}>Deposit, swap, send, or cash out</p>
                </div>
            )}
            {variant === 'responsive' && (
                <p className={`${compact ? 'mb-1.5 text-[0.5625rem]' : 'mb-2.5'} lg:hidden ${dash.sectionLabel}`}>Quick actions</p>
            )}
            <div className={gridClass}>
                {actions.map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href} className={linkClass(isSidebar)}>
                        <span
                            className={`flex shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-white/65 ring-1 ring-white/[0.06] transition-all duration-200 group-hover:bg-[var(--brand-accent-muted)] group-hover:text-[var(--brand-accent)] group-hover:ring-[var(--brand-accent-border)] ${
                                compact ? 'h-7 w-7' : 'h-9 w-9 rounded-xl lg:h-8 lg:w-8 lg:rounded-lg'
                            }`}
                        >
                            <Icon className={compact ? 'h-3 w-3' : 'h-4 w-4 lg:h-3.5 lg:w-3.5'} strokeWidth={2} />
                        </span>
                        <span className={compact ? 'text-[0.5625rem] font-semibold leading-tight text-white/85' : 'text-[0.6875rem] font-semibold leading-tight text-white/85 sm:text-xs'}>{label}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
