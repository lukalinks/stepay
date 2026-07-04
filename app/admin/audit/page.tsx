'use client';

import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import {
    AdminBadge,
    AdminEmptyState,
    AdminLoading,
    AdminPageHeader,
    admin,
} from '@/components/admin/admin-ui';

type AuditRow = {
    id: string;
    user_id: string;
    user_email: string | null;
    intent_id: string | null;
    reason: string;
    tx_hash: string | null;
    ip: string | null;
    created_at: string;
};

export default function AdminAuditPage() {
    const [loading, setLoading] = useState(true);
    const [audit, setAudit] = useState<AuditRow[]>([]);
    const [meta, setMeta] = useState<{
        intentStats?: { status: string; c: number }[];
        walletStorage?: { encrypted: number; plaintext: number };
        encryptionConfigured?: boolean;
    }>({});

    useEffect(() => {
        fetch('/api/admin/audit?limit=200')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data) {
                    setAudit(data.audit ?? []);
                    setMeta({
                        intentStats: data.intentStats,
                        walletStorage: data.walletStorage,
                        encryptionConfigured: data.encryptionConfigured,
                    });
                }
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <AdminLoading />;

    const storage = meta.walletStorage;

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Security audit"
                subtitle="Signing events, wallet encryption status, and confirmation intents."
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <div className={`${admin.card} p-4`}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Encryption</p>
                    <p className="mt-2 flex items-center gap-2 text-lg font-bold text-slate-900">
                        <Shield className="h-5 w-5 text-[var(--brand-accent)]" />
                        {meta.encryptionConfigured ? 'Configured' : 'Missing key'}
                    </p>
                </div>
                <div className={`${admin.card} p-4`}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Encrypted wallets</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{storage?.encrypted ?? 0}</p>
                </div>
                <div className={`${admin.card} p-4`}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plaintext remaining</p>
                    <p className={`mt-2 text-2xl font-bold ${Number(storage?.plaintext) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {storage?.plaintext ?? 0}
                    </p>
                </div>
            </div>

            {(meta.intentStats?.length ?? 0) > 0 && (
                <div className={`${admin.card} p-4`}>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Sign intents (7 days)</p>
                    <div className="flex flex-wrap gap-2">
                        {meta.intentStats?.map((row) => (
                            <AdminBadge key={row.status} tone="default">
                                {row.status}: {row.c}
                            </AdminBadge>
                        ))}
                    </div>
                </div>
            )}

            {Number(storage?.plaintext) > 0 && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Run <code className="font-mono text-xs">npm run db:migrate-wallets</code> to encrypt remaining wallet secrets.
                </p>
            )}

            <div className={admin.card}>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Time</th>
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Reason</th>
                                <th className="px-4 py-3">Tx hash</th>
                                <th className="px-4 py-3">IP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {audit.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>
                                        <AdminEmptyState message="No signing events yet." />
                                    </td>
                                </tr>
                            ) : (
                                audit.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50/80">
                                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                            {new Date(row.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-slate-800">{row.user_email || row.user_id.slice(0, 8)}</td>
                                        <td className="px-4 py-3">
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-700">
                                                {row.reason}
                                            </span>
                                        </td>
                                        <td className="max-w-[140px] truncate px-4 py-3 font-mono text-xs text-slate-600">
                                            {row.tx_hash ? (
                                                <a
                                                    href={`https://stellar.expert/explorer/public/tx/${row.tx_hash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[#8B7344] hover:underline"
                                                >
                                                    {row.tx_hash.slice(0, 10)}…
                                                </a>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{row.ip || '—'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
