'use client';

import { dash } from '@/lib/dashboard-ui';

/** Compact inline form error — no icon box or generic title. */
export function FormError({
    children,
    className = '',
    variant = 'error',
}: {
    children?: string | null;
    className?: string;
    variant?: 'error' | 'warning';
}) {
    if (!children?.trim()) return null;
    const styles = variant === 'warning' ? dash.formWarning : dash.formError;
    return (
        <p role="alert" className={`${styles} ${className}`}>
            {children}
        </p>
    );
}

export function isXlmReserveMessage(message: string): boolean {
    return /keep at least .* xlm for network reserves/i.test(message);
}
