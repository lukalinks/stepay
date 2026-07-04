import { dash } from '@/lib/dashboard-ui';

interface DashboardPageHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export function DashboardPageHeader({ title, subtitle, action }: DashboardPageHeaderProps) {
    return (
        <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                <h1 className={dash.pageTitle}>{title}</h1>
                {subtitle && <p className={dash.pageSubtitle}>{subtitle}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </header>
    );
}
