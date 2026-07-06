'use client';

import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { AdminPageHeader, admin } from '@/components/admin/admin-ui';

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

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Reports & exports"
                subtitle="CSV exports for compliance and reconciliation"
            />

            <div className="grid gap-4 sm:grid-cols-3">
                {[
                    { type: 'transactions', label: 'Transactions', desc: 'All tx with user email/phone' },
                    { type: 'users', label: 'Users', desc: 'Accounts, KYC tier, wallet' },
                    { type: 'alerts', label: 'Compliance alerts', desc: 'Monitoring alerts log' },
                ].map((item) => (
                    <button
                        key={item.type}
                        type="button"
                        onClick={() => exportCsv(item.type)}
                        className={`${admin.card} p-5 text-left transition hover:border-slate-300 hover:shadow-md`}
                    >
                        <FileText className="h-6 w-6 text-[var(--brand-accent)]" />
                        <p className="mt-3 font-semibold text-slate-900">{item.label}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
                        <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-accent)]">
                            <Download className="h-4 w-4" /> Download CSV
                        </p>
                    </button>
                ))}
            </div>

            {adminRole === 'admin' && (
                <p className="text-xs text-slate-500">Exports are logged in the admin action audit trail.</p>
            )}
        </div>
    );
}
