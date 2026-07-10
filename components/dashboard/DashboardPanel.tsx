import { dash } from '@/lib/dashboard-ui';

interface DashboardPanelProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    subtitle?: string;
    /** Wider panel for multi-section flows (merchant, etc.) */
    wide?: boolean;
}

export function DashboardPanel({ children, className = '', title, subtitle, wide }: DashboardPanelProps) {
    const widthClass = wide ? 'max-w-3xl' : 'max-w-md sm:max-w-lg';

    return (
        <div className={`mx-auto w-full min-w-0 ${widthClass} ${className}`}>
            <div className={dash.panel}>
                {(title || subtitle) && (
                    <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
                        {title && <h2 className={dash.heading}>{title}</h2>}
                        {subtitle && <p className={dash.hint}>{subtitle}</p>}
                    </div>
                )}
                {children}
            </div>
        </div>
    );
}
