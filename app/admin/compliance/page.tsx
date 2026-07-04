'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
    AdminBadge,
    AdminLoading,
    AdminPageHeader,
    admin,
} from '@/components/admin/admin-ui';

type Alert = {
    id: string;
    alert_type: string;
    severity: string;
    message: string;
    user_email?: string;
    created_at: string;
    resolved: boolean;
};

export default function AdminCompliancePage() {
    const [data, setData] = useState<{
        alerts: Alert[];
        tierStats: { kyc_tier: string; c: number }[];
        pendingPhoneTransfers: number;
        last24h: { tx_count: number; volume: number };
    } | null>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        fetch('/api/admin/compliance')
            .then((r) => r.json())
            .then(setData)
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const resolve = async (alertId: string) => {
        await fetch('/api/admin/compliance', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alertId }),
        });
        load();
    };

    if (loading) return <AdminLoading />;

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Compliance & monitoring"
                subtitle="BoZ VASP readiness — tier limits, alerts, and transaction monitoring."
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <div className={`${admin.card} p-4`}>
                    <p className="text-xs font-medium uppercase text-slate-500">24h transactions</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{data?.last24h?.tx_count ?? 0}</p>
                </div>
                <div className={`${admin.card} p-4`}>
                    <p className="text-xs font-medium uppercase text-slate-500">Pending phone claims</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{data?.pendingPhoneTransfers ?? 0}</p>
                </div>
                <div className={`${admin.card} p-4`}>
                    <p className="text-xs font-medium uppercase text-slate-500">KYC tiers</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {(data?.tierStats ?? []).map((t) => (
                            <AdminBadge key={t.kyc_tier} tone="default">
                                {t.kyc_tier}: {t.c}
                            </AdminBadge>
                        ))}
                    </div>
                </div>
            </div>

            <div className={admin.card}>
                <div className={`${admin.cardHeader} flex items-center gap-2`}>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <h2 className="font-semibold text-slate-800">Compliance alerts</h2>
                </div>
                <div className="divide-y divide-slate-100">
                    {(data?.alerts ?? []).length === 0 ? (
                        <p className="p-6 text-sm text-slate-500">No alerts recorded.</p>
                    ) : (
                        (data?.alerts ?? []).map((a) => (
                            <div key={a.id} className="px-4 py-3 flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                        a.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                        a.severity === 'warning' ? 'bg-amber-100 text-amber-800' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>{a.alert_type}</span>
                                    <p className="text-sm text-slate-800 mt-1">{a.message}</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {a.user_email ?? '—'} · {new Date(a.created_at).toLocaleString()}
                                    </p>
                                </div>
                                {!a.resolved && (
                                    <button
                                        type="button"
                                        onClick={() => resolve(a.id)}
                                        className="text-xs font-medium text-[var(--brand-accent)] hover:underline"
                                    >
                                        Resolve
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
