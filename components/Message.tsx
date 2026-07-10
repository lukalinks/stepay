'use client';

import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

type Variant = 'success' | 'error' | 'warning' | 'info';

const variants: Record<Variant, { bg: string; border: string; iconBg: string; icon: React.ElementType; iconColor: string; titleColor: string; textColor: string }> = {
    success: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        iconBg: 'bg-emerald-100',
        icon: CheckCircle,
        iconColor: 'text-emerald-600',
        titleColor: 'text-emerald-900',
        textColor: 'text-emerald-800',
    },
    error: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        iconBg: 'bg-red-100',
        icon: AlertCircle,
        iconColor: 'text-red-600',
        titleColor: 'text-red-900',
        textColor: 'text-red-800',
    },
    warning: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        iconBg: 'bg-amber-100',
        icon: AlertTriangle,
        iconColor: 'text-amber-600',
        titleColor: 'text-amber-900',
        textColor: 'text-amber-800',
    },
    info: {
        bg: 'bg-amber-50/80',
        border: 'border-[#C9A962]/30',
        iconBg: 'bg-[#C9A962]/15',
        icon: Info,
        iconColor: 'text-[#A8894A]',
        titleColor: 'text-[#0C0A06]',
        textColor: 'text-[#3d3520]',
    },
};

interface MessageProps {
    variant?: Variant;
    title?: string;
    children: React.ReactNode;
    role?: 'alert' | 'status';
    className?: string;
    dark?: boolean;
}

const darkVariants: Record<Variant, typeof variants.success> = {
    success: {
        bg: 'bg-[var(--brand-accent)]/10',
        border: 'border-[var(--brand-accent)]/25',
        iconBg: 'bg-[var(--brand-accent)]/15',
        icon: CheckCircle,
        iconColor: 'text-[var(--brand-accent)]',
        titleColor: 'text-white',
        textColor: 'text-white/75',
    },
    error: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/25',
        iconBg: 'bg-red-500/15',
        icon: AlertCircle,
        iconColor: 'text-red-400',
        titleColor: 'text-white',
        textColor: 'text-white/75',
    },
    warning: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/25',
        iconBg: 'bg-amber-500/15',
        icon: AlertTriangle,
        iconColor: 'text-amber-400',
        titleColor: 'text-white',
        textColor: 'text-white/75',
    },
    info: {
        bg: 'bg-white/[0.04]',
        border: 'border-white/[0.1]',
        iconBg: 'bg-[var(--brand-accent)]/12',
        icon: Info,
        iconColor: 'text-[var(--brand-accent)]',
        titleColor: 'text-white',
        textColor: 'text-white/75',
    },
};

export function Message({ variant = 'warning', title, children, role = 'alert', className = '', dark = false }: MessageProps) {
    const v = dark ? darkVariants[variant] : variants[variant];
    const Icon = v.icon;

    return (
        <div
            role={role}
            className={`flex gap-4 p-4 sm:p-5 rounded-2xl border ${v.bg} ${v.border} ${className}`}
        >
            <div className={`shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${v.iconBg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${v.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
                {title && <p className={`font-semibold text-sm sm:text-base ${v.titleColor}`}>{title}</p>}
                <div className={`mt-0.5 text-sm sm:text-base ${title ? v.textColor : v.titleColor}`}>{children}</div>
            </div>
        </div>
    );
}
