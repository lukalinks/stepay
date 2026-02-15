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
        bg: 'bg-teal-50',
        border: 'border-teal-200',
        iconBg: 'bg-teal-100',
        icon: Info,
        iconColor: 'text-teal-600',
        titleColor: 'text-teal-900',
        textColor: 'text-teal-800',
    },
};

interface MessageProps {
    variant?: Variant;
    title?: string;
    children: React.ReactNode;
    role?: 'alert' | 'status';
    className?: string;
}

export function Message({ variant = 'warning', title, children, role = 'alert', className = '' }: MessageProps) {
    const v = variants[variant];
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
