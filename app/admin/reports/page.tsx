'use client';

import { useEffect, useState } from 'react';
import { Download, FileText, ShieldAlert, Users, History } from 'lucide-react';
import { AdminPageHeader, admin } from '@/components/admin/admin-ui';
import { canExportPii, canExportTransactions } from '@/lib/admin-roles';
import type { LucideIcon } from 'lucide-react';

export default function AdminReportsPage() {
    const [adminRole, setAdminRole] = useState('');

    useEffect(() => {
        fetch('/api/admin/stats')
            .then((r) => r.json())
            .then((d) => setAdminRole(d.adminRole || ''));
    }, []);

    const exportCsv = (type: string) => {
        window.location.href = `/api/admin/export?type=${type}`;
    };

    const items: Array<{
        type: string;
        label: string;
        desc: string;
        allowed: boolean;
        deny: string;
        icon: LucideIcon;
        iconClass: string;
    }> = [
        {
            type: 'transactions',
            label: 'Transactions',
            desc: 'All tx with user email/phone',
            allowed: canExportTransactions(adminRole),
            deny: 'Ops role required',
            icon: History,
            iconClass: 'bg-sky-50/80 text-sky-700',
        },
        {
            type: 'users',
            label: 'Users',
            desc: 'Accounts, KYC tier, wallet',
            allowed: canExportPii(adminRole),
            deny: 'Superadmin only',
            icon: Users,
            iconClass: 'bg-violet-50/80 text-violet-700',
        },
        {
            type: 'alerts',
            label: 'Compliance alerts',
            desc: 'Monitoring alerts log',
            allowed: canExportTransactions(adminRole),
            deny: 'Ops role required',
            icon: ShieldAlert,
            iconClass: 'bg-amber-50/80 text-amber-700',
        },
    ];

    return (
        <div className="space-y-6 lg:space-y-8">
            <AdminPageHeader
                eyebrow="Exports"
                title="Reports & exports"
                subtitle="CSV exports for compliance and reconciliation"
            />

            <div className="grid gap-3 sm:grid-cols-3">
                {items.map((item) => {
                    const Icon = item.icon;
                    const enabled = Boolean(adminRole) && item.allowed;
                    return (
                        <button
                            key={item.type}
                            type="button"
                            disabled={!enabled}
                            onClick={() => item.allowed && exportCsv(item.type)}
                            className={`${admin.card} group p-5 text-left transition duration-200 ${
                                enabled
                                    ? 'hover:-translate-y-0.5 hover:border-[var(--brand-accent-border)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.06)]'
                                    : 'cursor-not-allowed opacity-50'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <p className="text-[11px] font-medium tracking-wide text-slate-500">{item.label}</p>
                                <div
                                    className={`rounded-lg p-1.5 ring-1 ring-inset ring-black/[0.03] ${item.iconClass}`}
                                >
                                    <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                                </div>
                            </div>
                            <p className="mt-4 text-sm font-semibold tracking-tight text-slate-900">{item.label}</p>
                            <p className="mt-1.5 text-[13px] text-slate-500">{item.desc}</p>
                            {item.allowed ? (
                                <p className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#8B7344] transition group-hover:text-[var(--brand-accent)]">
                                    <Download className="h-3.5 w-3.5" strokeWidth={1.75} /> Download CSV
                                </p>
                            ) : (
                                <p className="mt-4 text-[12px] text-slate-400">{item.deny}</p>
                            )}
                        </button>
                    );
                })}
            </div>

            <p className="flex items-center gap-2 text-[11px] text-slate-400">
                <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
                Exports are logged in the admin action audit trail.
            </p>
        </div>
    );
}
