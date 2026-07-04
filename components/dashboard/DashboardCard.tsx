import { dash } from '@/lib/dashboard-ui';

interface DashboardCardProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    action?: React.ReactNode;
    className?: string;
    bodyClassName?: string;
    noPadding?: boolean;
}

export function DashboardCard({
    children,
    title,
    subtitle,
    action,
    className = '',
    bodyClassName = '',
    noPadding = false,
}: DashboardCardProps) {
    const hasHeader = title || action;

    return (
        <section className={`${dash.card} ${className}`}>
            {hasHeader && (
                <div className={dash.cardHeader}>
                    <div>
                        {title && <h2 className={dash.cardTitle}>{title}</h2>}
                        {subtitle && <p className={dash.cardSubtitle}>{subtitle}</p>}
                    </div>
                    {action}
                </div>
            )}
            <div className={noPadding ? bodyClassName : `${dash.panelPadding} ${bodyClassName}`}>{children}</div>
        </section>
    );
}
