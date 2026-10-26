'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Lock, Shield, Unlock } from 'lucide-react';
import {
    AdminBadge,
    AdminEmptyState,
    AdminLoading,
    AdminPageHeader,
    admin,
    adminTable,
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

function relativeTime(iso: string) {
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AdminAuditPage() {
    const [loading, setLoading] = useState(true);
    const [audit, setAudit] = useState<AuditRow[]>([]);
    const [adminActions, setAdminActions] = useState<
        Array<{ id: string; action: string; adminEmail: string; targetType: string | null; targetId: string | null; createdAt: string }>
    >([]);
    const [meta, setMeta] = useState<{
        intentStats?: { status: string; c: number }[];
        walletStorage?: { encrypted: number; plaintext: number };
        encryptionConfigured?: boolean;
    }>({});

    useEffect(() => {
        Promise.all([
            fetch('/api/admin/audit?limit=200').then((res) => (res.ok ? res.json() : null)),
            fetch('/api/admin/actions?limit=50').then((res) => (res.ok ? res.json() : null)),
        ])
            .then(([auditData, actionsData]) => {
                if (auditData) {
                    setAudit(auditData.audit ?? []);
                    setMeta({
                        intentStats: auditData.intentStats,
                        walletStorage: auditData.walletStorage,
                        encryptionConfigured: auditData.encryptionConfigured,
                    });
                }
                if (actionsData) setAdminActions(actionsData.actions ?? []);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <AdminLoading />;

    const storage = meta.walletStorage;
    const plaintext = Number(storage?.plaintext) || 0;

    return (
        <div className="space-y-6 lg:space-y-8">
            <AdminPageHeader
                eyebrow="Security"
                title="Security audit"
                subtitle="Signing events, wallet encryption status, and confirmation intents."
            />

            <div className="grid gap-3 sm:grid-cols-3">
                <div className={`${admin.card} p-3.5`}>
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-medium text-slate-500">Encryption</p>
                        <div
                            className={`rounded-lg p-1.5 ring-1 ring-inset ring-black/[0.03] ${
                                meta.encryptionConfigured
                                    ? 'bg-emerald-50/80 text-emerald-700'
                                    : 'bg-rose-50/80 text-rose-700'
                            }`}
                        >
                            <Shield className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
                        {meta.encryptionConfigured ? 'Configured' : 'Missing'}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">
                        {meta.encryptionConfigured ? 'Key present' : 'Encryption key missing'}
                    </p>
                </div>
                <div className={`${admin.card} p-3.5`}>
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-medium text-slate-500">Encrypted wallets</p>
                        <div className="rounded-lg bg-[var(--brand-accent-muted)] p-1.5 text-[#8B7344] ring-1 ring-inset ring-black/[0.03]">
                            <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                        {(storage?.encrypted ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">At rest</p>
                </div>
                <div className={`${admin.card} p-3.5`}>
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-medium text-slate-500">Plaintext remaining</p>
                        <div
                            className={`rounded-lg p-1.5 ring-1 ring-inset ring-black/[0.03] ${
                                plaintext > 0
                                    ? 'bg-amber-50/80 text-amber-700'
                                    : 'bg-emerald-50/80 text-emerald-700'
                            }`}
                        >
                            <Unlock className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                    </div>
                    <p
                        className={`mt-2 text-xl font-semibold tabular-nums tracking-tight ${
                            plaintext > 0 ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                    >
                        {plaintext.toLocaleString()}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">Need migration</p>
                </div>
            </div>

            {(meta.intentStats?.length ?? 0) > 0 && (
                <div className={`${admin.card} px-5 py-4`}>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                        Sign intents (7 days)
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {meta.intentStats?.map((row) => (
                            <AdminBadge key={row.status} tone="default">
                                {row.status}: {row.c}
                            </AdminBadge>
                        ))}
                    </div>
                </div>
            )}

            {plaintext > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
                    Run <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-[11px]">npm run db:migrate-wallets</code> to
                    encrypt remaining wallet secrets.
                </div>
            )}

            {adminActions.length > 0 && (
                <div className={admin.card}>
                    <div className="flex items-center gap-2.5 border-b border-slate-100/80 px-5 py-4">
                        <div className="rounded-xl bg-violet-50/80 p-2 text-violet-700 ring-1 ring-inset ring-black/[0.03]">
                            <KeyRound className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold tracking-tight text-slate-900">Admin action log</h2>
                            <p className="text-[11px] text-slate-400">{adminActions.length} recent actions</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className={adminTable.head}>
                                    <th className={adminTable.thTight}>Time</th>
                                    <th className={adminTable.thTight}>Admin</th>
                                    <th className={adminTable.thTight}>Action</th>
                                    <th className={adminTable.th}>Target</th>
                                </tr>
                            </thead>
                            <tbody>
                                {adminActions.map((a) => (
                                    <tr key={a.id} className={adminTable.row}>
                                        <td
                                            className={`${adminTable.tdTight} text-[12px] text-slate-500`}
                                            title={new Date(a.createdAt).toLocaleString()}
                                        >
                                            {relativeTime(a.createdAt)}
                                        </td>
                                        <td className={`${adminTable.tdTight} text-[13px] font-medium text-slate-800`}>
                                            {a.adminEmail}
                                        </td>
                                        <td className={`${adminTable.tdTight} font-mono text-[11px] text-slate-600`}>
                                            {a.action}
                                        </td>
                                        <td className={`${adminTable.td} text-[13px] text-slate-500`}>
                                            {a.targetType ? `${a.targetType}:${a.targetId?.slice(0, 8)}…` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className={admin.card}>
                <div className="border-b border-slate-100/80 px-5 py-4">
                    <h2 className="text-sm font-semibold tracking-tight text-slate-900">Signing events</h2>
                    <p className="mt-0.5 text-[11px] text-slate-400">{audit.length} events</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead>
                            <tr className={adminTable.head}>
                                <th className={adminTable.thTight}>Time</th>
                                <th className={adminTable.thTight}>User</th>
                                <th className={adminTable.thTight}>Reason</th>
                                <th className={adminTable.thTight}>Tx hash</th>
                                <th className={adminTable.th}>IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {audit.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>
                                        <AdminEmptyState message="No signing events yet." />
                                    </td>
                                </tr>
                            ) : (
                                audit.map((row) => (
                                    <tr key={row.id} className={adminTable.row}>
                                        <td
                                            className={`${adminTable.tdTight} text-[12px] text-slate-500`}
                                            title={new Date(row.created_at).toLocaleString()}
                                        >
                                            {relativeTime(row.created_at)}
                                        </td>
                                        <td className={`${adminTable.tdTight} text-[13px] font-medium text-slate-800`}>
                                            {row.user_email || row.user_id.slice(0, 8)}
                                        </td>
                                        <td className={adminTable.tdTight}>
                                            <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-600 ring-1 ring-inset ring-slate-100">
                                                {row.reason}
                                            </span>
                                        </td>
                                        <td className={`${adminTable.tdTight} max-w-[140px] truncate font-mono text-[11px]`}>
                                            {row.tx_hash ? (
                                                <a
                                                    href={`https://stellar.expert/explorer/public/tx/${row.tx_hash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[#8B7344] hover:text-[var(--brand-accent)]"
                                                >
                                                    {row.tx_hash.slice(0, 10)}…
                                                </a>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className={`${adminTable.td} text-[13px] text-slate-500`}>
                                            {row.ip || '—'}
                                        </td>
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
