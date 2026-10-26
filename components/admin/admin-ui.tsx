'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { formatTxStatus, formatTxType, txStatusTone as toneForStatus, type TxStatusTone } from '@/lib/tx-status';

export { formatTxStatus, formatTxType };

export const admin = {
    pageTitle: 'text-[1.75rem] font-semibold tracking-tight text-slate-900 sm:text-[2rem] font-heading',
    pageSubtitle: 'mt-1.5 text-sm text-slate-500/90',
    card: 'rounded-2xl border border-slate-200/70 bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_rgba(15,23,42,0.03)] backdrop-blur-sm overflow-hidden',
    cardHeader: 'border-b border-slate-100/80 px-5 py-4 sm:px-6',
    input:
        'w-full rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent-ring)]',
    select:
        'rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[var(--brand-accent-ring)]',
    btnPrimary:
        'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-[var(--brand-accent-contrast)] shadow-sm transition hover:bg-[var(--brand-accent-hover)] disabled:opacity-60',
    btnSecondary:
        'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900 disabled:opacity-50',
    iconBtn:
        'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-500 transition hover:border-slate-300 hover:bg-white hover:text-slate-800',
} as const;

type StatTone = 'default' | 'warning' | 'success' | 'danger';

const toneStyles: Record<StatTone, { icon: string; value: string }> = {
    default: { icon: 'bg-[var(--brand-accent-muted)] text-[#8B7344]', value: 'text-slate-900' },
    warning: { icon: 'bg-amber-100 text-amber-700', value: 'text-amber-700' },
    success: { icon: 'bg-emerald-100 text-emerald-700', value: 'text-emerald-700' },
    danger: { icon: 'bg-red-100 text-red-700', value: 'text-red-700' },
};

export function AdminKpiCard({
    label,
    value,
    changePct,
    icon: Icon,
    iconClassName,
    href,
}: {
    label: string;
    value: React.ReactNode;
    changePct?: number;
    icon?: LucideIcon;
    iconClassName?: string;
    href?: string;
}) {
    const up = (changePct ?? 0) >= 0;
    const inner = (
        <>
            <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-medium tracking-wide text-slate-500">{label}</p>
                {Icon && (
                    <div
                        className={`rounded-lg p-1.5 ring-1 ring-inset ring-black/[0.03] ${
                            iconClassName || 'bg-[var(--brand-accent-muted)] text-[var(--brand-accent)]'
                        }`}
                    >
                        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </div>
                )}
            </div>
            <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900 tabular-nums leading-none">
                {value}
            </p>
            {typeof changePct === 'number' && (
                <div className="mt-2 flex items-center gap-1.5">
                    <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                            up
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100'
                                : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100'
                        }`}
                    >
                        {up ? '↑' : '↓'} {Math.abs(changePct).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-400">vs last 7d</span>
                </div>
            )}
        </>
    );
    const className = `${admin.card} group p-3.5 transition duration-200 ${
        href ? 'hover:-translate-y-0.5 hover:border-[var(--brand-accent-border)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.06)]' : ''
    }`;
    if (href) {
        return (
            <Link href={href} className={`block ${className}`}>
                {inner}
            </Link>
        );
    }
    return <div className={className}>{inner}</div>;
}

export function AdminPageHeader({
    title,
    subtitle,
    action,
    eyebrow,
}: {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    eyebrow?: string;
}) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                {eyebrow && (
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {eyebrow}
                    </p>
                )}
                <h1 className={admin.pageTitle}>{title}</h1>
                {subtitle && <p className={admin.pageSubtitle}>{subtitle}</p>}
            </div>
            {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
        </div>
    );
}

export const adminTable = {
    head: 'border-b border-slate-100 text-[11px] uppercase tracking-[0.08em] text-slate-400',
    th: 'px-5 py-3 font-medium',
    thTight: 'px-4 py-3 font-medium',
    row: 'border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70',
    td: 'px-5 py-3.5 text-[13px]',
    tdTight: 'px-4 py-3.5 text-[13px]',
} as const;

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
    tone?: TxStatusTone;
}) {
    const cls =
        tone === 'success'
            ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80'
            : tone === 'warning'
              ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80'
              : tone === 'danger'
                ? 'bg-red-100 text-red-800 ring-1 ring-red-200/80'
                : tone === 'info'
                  ? 'bg-sky-50 text-sky-800 ring-1 ring-sky-200/80'
                  : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80';
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-normal ${cls}`}>
            {children}
        </span>
    );
}

/** Human-readable transaction status badge (not raw PENDING/PROCESSING). */
export function TxStatusBadge({
    status,
    type,
    asset,
}: {
    status: string;
    type?: string;
    asset?: string;
}) {
    return (
        <AdminBadge tone={toneForStatus(status)}>
            {formatTxStatus(status, type, asset)}
        </AdminBadge>
    );
}

export function txStatusTone(status: string): TxStatusTone {
    return toneForStatus(status);
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
