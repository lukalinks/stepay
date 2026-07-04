'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

export const admin = {
    pageTitle: 'text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl font-heading',
    pageSubtitle: 'mt-1 text-sm text-slate-500',
    card: 'rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden',
    cardHeader: 'border-b border-slate-200 px-5 py-4 sm:px-6',
    input:
        'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent-ring)]',
    select:
        'rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent-ring)]',
    btnPrimary:
        'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--brand-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--brand-accent-contrast)] shadow-sm transition hover:bg-[var(--brand-accent-hover)] disabled:opacity-60',
    btnSecondary:
        'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50',
} as const;

type StatTone = 'default' | 'warning' | 'success' | 'danger';

const toneStyles: Record<StatTone, { icon: string; value: string }> = {
    default: { icon: 'bg-slate-100 text-slate-600', value: 'text-slate-900' },
    warning: { icon: 'bg-amber-100 text-amber-700', value: 'text-amber-700' },
    success: { icon: 'bg-emerald-100 text-emerald-700', value: 'text-emerald-700' },
    danger: { icon: 'bg-red-100 text-red-700', value: 'text-red-700' },
};

export function AdminPageHeader({
    title,
    subtitle,
    action,
}: {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <h1 className={admin.pageTitle}>{title}</h1>
                {subtitle && <p className={admin.pageSubtitle}>{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

export function AdminStatCard({
    label,
    value,
    hint,
    href,
    icon: Icon,
    tone = 'default',
}: {
    label: string;
    value: React.ReactNode;
    hint?: string;
    href?: string;
    icon?: LucideIcon;
    tone?: StatTone;
}) {
    const styles = toneStyles[tone];
    const inner = (
        <>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className={`mt-2 text-2xl font-bold sm:text-3xl ${styles.value}`}>{value}</p>
                </div>
                {Icon && (
                    <div className={`rounded-xl p-3 ${styles.icon}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                )}
            </div>
            {hint && <p className="mt-3 text-xs text-slate-500">{hint}</p>}
            {href && <p className="mt-3 text-sm font-medium text-[var(--brand-accent)]">View details →</p>}
        </>
    );

    const className = `${admin.card} p-5 transition ${href ? 'hover:border-slate-300 hover:shadow-md' : ''}`;

    if (href) {
        return (
            <Link href={href} className={`group block ${className}`}>
                {inner}
            </Link>
        );
    }

    return <div className={className}>{inner}</div>;
}

export function AdminBadge({
    children,
    tone = 'default',
}: {
    children: React.ReactNode;
    tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) {
    const cls =
        tone === 'success'
            ? 'bg-emerald-100 text-emerald-800'
            : tone === 'warning'
              ? 'bg-amber-100 text-amber-800'
              : tone === 'danger'
                ? 'bg-red-100 text-red-800'
                : tone === 'info'
                  ? 'bg-[var(--brand-accent-muted)] text-[#8B7344]'
                  : 'bg-slate-100 text-slate-700';
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

export function txStatusTone(status: string): 'success' | 'warning' | 'danger' | 'default' {
    if (status === 'COMPLETED') return 'success';
    if (status === 'PENDING' || status === 'PROCESSING') return 'warning';
    if (status === 'FAILED') return 'danger';
    return 'default';
}

export function AdminEmptyState({ message }: { message: string }) {
    return <div className="py-16 text-center text-sm text-slate-500">{message}</div>;
}

export function AdminPagination({
    offset,
    limit,
    total,
    onChange,
}: {
    offset: number;
    limit: number;
    total: number;
    onChange: (nextOffset: number) => void;
}) {
    if (total <= limit) return null;
    const page = Math.floor(offset / limit) + 1;
    const pages = Math.ceil(total / limit);

    return (
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm text-slate-600">
            <span>
                Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </span>
            <div className="flex gap-2">
                <button
                    type="button"
                    disabled={offset === 0}
                    onClick={() => onChange(Math.max(0, offset - limit))}
                    className={admin.btnSecondary}
                >
                    Previous
                </button>
                <span className="flex items-center px-2 tabular-nums">
                    {page} / {pages}
                </span>
                <button
                    type="button"
                    disabled={offset + limit >= total}
                    onClick={() => onChange(offset + limit)}
                    className={admin.btnSecondary}
                >
                    Next
                </button>
            </div>
        </div>
    );
}

export function AdminLoading() {
    return (
        <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--brand-accent)]" />
        </div>
    );
}

export function AdminErrorBanner({ message }: { message: string }) {
    return (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{message}</div>
    );
}
