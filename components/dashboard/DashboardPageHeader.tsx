import { BackButton } from '@/components/BackButton';
import { dash } from '@/lib/dashboard-ui';

interface DashboardPageHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    /** When set, shows the shared circular back control above the title */
    backHref?: string;
    backLabel?: string;
}

export function DashboardPageHeader({
    title,
    subtitle,
    action,
    backHref,
    backLabel = 'Back',
}: DashboardPageHeaderProps) {
    return (
        <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                {backHref && (
                    <div className="mb-2">
                        <BackButton href={backHref} label={backLabel} variant="dark" />
                    </div>
                )}
                <h1 className={dash.pageTitle}>{title}</h1>
                {subtitle && <p className={dash.pageSubtitle}>{subtitle}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </header>
    );
}
