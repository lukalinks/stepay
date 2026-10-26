'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { RefreshCw, ShieldOff, ShieldCheck, LogOut, Wallet } from 'lucide-react';
import {
    AdminBadge,
    AdminEmptyState,
    AdminErrorBanner,
    AdminLoading,
    admin,
    adminTable,
    TxStatusBadge,
    formatTxType,
} from '@/components/admin/admin-ui';
import { BackButton } from '@/components/BackButton';
import { TxDetailDrawer } from '@/components/admin/TxDetailDrawer';

type UserDetail = {
    user: {
        id: string;
        email: string;
        phone: string;
        phoneNormalized?: string | null;
        fullName?: string | null;
        address?: string | null;
        idDocumentType?: string | null;
        idDocumentNumber?: string | null;
        preferredOperator?: string | null;
        role: string;
        createdAt: string;
        updatedAt?: string | null;
        wallet: string;
        countryCode?: string;
        kycTier: string;
        profileComplete?: boolean;
        suspended: boolean;
        suspendedReason: string | null;
    };
    transactions: Array<{
        id: string;
        type: string;
        asset: string;
        amountFiat: number;
        amountXlm: number;
        status: string;
        reference: string;
        createdAt: string;
    }>;
    alerts: Array<{
        id: string;
        alert_type: string;
        severity: string;
        message: string;
        resolved: boolean;
        created_at: string;
    }>;
    merchant: {
        checkoutCount: number;
        apiKeys: Array<{ id: string; name: string; keyPrefix: string; revoked: boolean }>;
    };
};

function initials(name: string | null | undefined, email: string) {
    const base = (name || email || '?').trim();
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return base.slice(0, 2).toUpperCase();
}

function relativeTime(iso: string) {
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCrypto(amount: number, asset: string): string {
    const n = Number(amount) || 0;
    if (asset === 'usdc') return n.toFixed(2);
    if (n >= 1) return parseFloat(n.toFixed(4)).toString();
    return parseFloat(n.toFixed(6)).toString();
}

export default function AdminUserDetailPage() {
    const params = useParams();
    const id = String(params.id);
    const [data, setData] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const [selectedTx, setSelectedTx] = useState<string | null>(null);
    const [canManage, setCanManage] = useState(false);
    const [isSuperadmin, setIsSuperadmin] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        setError('');
        Promise.all([
            fetch(`/api/admin/users/${id}`).then((r) => {
                if (!r.ok) throw new Error('User not found');
                return r.json();
            }),
            fetch('/api/admin/stats').then((r) => r.json()),
        ])
            .then(([userData, stats]) => {
                setData(userData);
                setCanManage(['admin', 'admin_ops'].includes(stats.adminRole));
                setIsSuperadmin(stats.adminRole === 'admin');
            })
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const action = async (body: Record<string, unknown>) => {
        setMsg('');
        const res = await fetch(`/api/admin/users/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMsg(json.error || 'Action failed');
            return;
        }
        setMsg('Done');
        load();
    };

    if (loading && !data) return <AdminLoading />;
    if (error && !data) {
        return (
            <div className="space-y-4">
                <BackButton href="/admin/users" label="Back to users" variant="light" />
                <AdminErrorBanner message={error} />
            </div>
        );
    }

    const u = data!.user;
    const displayName = u.fullName || u.email || 'User';

    const profileFields: Array<[string, string | null | undefined]> = [
        ['Full name', u.fullName],
        ['Phone', u.phone],
        ['Normalized phone', u.phoneNormalized],
        ['Country', u.countryCode],
        ['Preferred operator', u.preferredOperator],
        ['ID document type', u.idDocumentType],
        ['ID document number', u.idDocumentNumber],
        ['Address', u.address],
        ['KYC tier', u.kycTier],
    ];

    return (
        <div className="space-y-6 lg:space-y-8">
            <BackButton href="/admin/users" label="Back to users" variant="light" />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-accent-muted)] text-base font-semibold text-[#8B7344] ring-1 ring-inset ring-black/[0.03]">
                        {initials(u.fullName, u.email)}
                    </span>
                    <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Account
                        </p>
                        <h1 className={admin.pageTitle}>{displayName}</h1>
                        <p className={admin.pageSubtitle}>
                            {u.email}
                            {u.phone ? ` · ${u.phone}` : ''} · joined{' '}
                            {new Date(u.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <button type="button" onClick={load} className={admin.btnSecondary}>
                    <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Refresh
                </button>
            </div>

            {msg && (
                <p className="rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-2.5 text-[13px] text-slate-700">
                    {msg}
                </p>
            )}

            <div className="flex flex-wrap gap-2">
                <AdminBadge tone={u.suspended ? 'danger' : 'success'}>
                    {u.suspended ? 'Suspended' : 'Active'}
                </AdminBadge>
                <AdminBadge tone={u.kycTier === 'verified' || u.kycTier === 'enhanced' ? 'success' : 'warning'}>
                    KYC: {u.kycTier}
                </AdminBadge>
                <AdminBadge tone={u.profileComplete ? 'success' : 'warning'}>
                    Profile: {u.profileComplete ? 'complete' : 'incomplete'}
                </AdminBadge>
                <AdminBadge tone="default">Role: {u.role}</AdminBadge>
                {u.countryCode && <AdminBadge tone="default">{u.countryCode}</AdminBadge>}
            </div>

            {!u.profileComplete && u.kycTier && u.kycTier !== 'TIER_0' && u.kycTier !== '0' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
                    KYC tier is {u.kycTier} but the user profile is incomplete — verify identity fields before raising
                    limits.
                </div>
            )}

            {u.suspended && u.suspendedReason && (
                <p className="text-[13px] font-medium text-rose-700">Reason: {u.suspendedReason}</p>
            )}

            <div className={admin.card}>
                <div className="border-b border-slate-100/80 px-5 py-4">
                    <h2 className="text-sm font-semibold tracking-tight text-slate-900">KYC / identity</h2>
                    {!u.profileComplete && (
                        <p className="mt-0.5 text-[11px] text-amber-700">User has not finished profile KYC</p>
                    )}
                </div>
                <div className="grid gap-3 p-5 sm:grid-cols-2">
                    {profileFields.map(([label, value]) => (
                        <div
                            key={label}
                            className={`rounded-xl bg-slate-50/70 px-4 py-3 ring-1 ring-inset ring-slate-100/80 ${
                                label === 'Address' ? 'sm:col-span-2' : ''
                            }`}
                        >
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                                {label}
                            </p>
                            <p className="mt-1 break-words text-[13px] font-medium text-slate-800">
                                {value ? String(value) : <span className="font-normal text-slate-400">— not provided —</span>}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className={`${admin.card} p-5`}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[13px] font-medium text-slate-500">Wallet</p>
                        <code className="mt-2 block break-all font-mono text-[12px] text-slate-700">{u.wallet}</code>
                    </div>
                    <div className="rounded-lg bg-[var(--brand-accent-muted)] p-1.5 text-[#8B7344] ring-1 ring-inset ring-black/[0.03]">
                        <Wallet className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </div>
                </div>
            </div>

            {canManage && (
                <div className={admin.card}>
                    <div className="border-b border-slate-100/80 px-5 py-4">
                        <h2 className="text-sm font-semibold tracking-tight text-slate-900">Actions</h2>
                    </div>
                    <div className="space-y-4 p-5">
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                className={admin.btnSecondary}
                                onClick={() => action({ action: 'retry_stuck' })}
                            >
                                Retry stuck ops
                            </button>
                            <button
                                type="button"
                                className={admin.btnSecondary}
                                onClick={() => action({ action: 'force_logout' })}
                            >
                                <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} /> Force logout
                            </button>
                            {u.suspended ? (
                                <button
                                    type="button"
                                    className={admin.btnPrimary}
                                    onClick={() => action({ action: 'unsuspend' })}
                                >
                                    <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} /> Unsuspend
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className={admin.btnSecondary}
                                    onClick={() => action({ action: 'suspend', reason: 'Suspended from admin' })}
                                >
                                    <ShieldOff className="h-3.5 w-3.5" strokeWidth={1.75} /> Suspend
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <label className="text-[13px] text-slate-600">KYC tier</label>
                            <select
                                className={admin.select}
                                value={u.kycTier}
                                onChange={(e) => action({ action: 'set_kyc_tier', kycTier: e.target.value })}
                            >
                                <option value="basic">basic</option>
                                <option value="verified">verified</option>
                                <option value="enhanced">enhanced</option>
                            </select>
                        </div>
                        {isSuperadmin && (
                            <div className="flex flex-wrap items-center gap-2">
                                <label className="text-[13px] text-slate-600">Admin role</label>
                                <select
                                    className={admin.select}
                                    value={u.role}
                                    onChange={(e) => action({ action: 'set_role', role: e.target.value })}
                                >
                                    <option value="user">user</option>
                                    <option value="admin_support">admin_support</option>
                                    <option value="admin_ops">admin_ops</option>
                                    <option value="admin">admin (superadmin)</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {data!.merchant.checkoutCount > 0 && (
                <div className={`${admin.card} p-5`}>
                    <p className="text-sm font-semibold tracking-tight text-slate-900">Merchant</p>
                    <p className="mt-1 text-[13px] text-slate-500">
                        {data!.merchant.checkoutCount} checkouts ·{' '}
                        {data!.merchant.apiKeys.filter((k) => !k.revoked).length} active API keys
                    </p>
                </div>
            )}

            <div className={admin.card}>
                <div className="border-b border-slate-100/80 px-5 py-4">
                    <h2 className="text-sm font-semibold tracking-tight text-slate-900">Recent transactions</h2>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                        {data!.transactions.length} shown
                    </p>
                </div>
                {data!.transactions.length === 0 ? (
                    <AdminEmptyState message="No transactions for this user." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead>
                                <tr className={adminTable.head}>
                                    <th className={adminTable.th}>Type</th>
                                    <th className={adminTable.thTight}>Amount</th>
                                    <th className={adminTable.thTight}>Status</th>
                                    <th className={adminTable.th}>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data!.transactions.map((tx) => (
                                    <tr
                                        key={tx.id}
                                        className={`${adminTable.row} cursor-pointer`}
                                        onClick={() => setSelectedTx(tx.id)}
                                    >
                                        <td className={`${adminTable.td} text-[13px] font-semibold text-slate-800`}>
                                            {formatTxType(tx.type)}
                                        </td>
                                        <td className={adminTable.tdTight}>
                                            <p className="text-[13px] font-semibold tabular-nums text-slate-800">
                                                {formatCrypto(tx.amountXlm, tx.asset)} {tx.asset.toUpperCase()}
                                            </p>
                                            <p className="text-[11px] tabular-nums text-slate-400">
                                                ZMW{' '}
                                                {Number(tx.amountFiat).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </p>
                                        </td>
                                        <td className={adminTable.tdTight}>
                                            <TxStatusBadge status={tx.status} type={tx.type} asset={tx.asset} />
                                        </td>
                                        <td
                                            className={`${adminTable.td} text-[12px] text-slate-500`}
                                            title={new Date(tx.createdAt).toLocaleString()}
                                        >
                                            {relativeTime(tx.createdAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {data!.alerts.length > 0 && (
                <div className={admin.card}>
                    <div className="border-b border-slate-100/80 px-5 py-4">
                        <h2 className="text-sm font-semibold tracking-tight text-slate-900">Compliance alerts</h2>
                    </div>
                    <ul className="divide-y divide-slate-50">
                        {data!.alerts.map((a) => (
                            <li key={a.id} className="px-5 py-3.5 transition hover:bg-slate-50/70">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <AdminBadge
                                        tone={
                                            a.severity === 'critical'
                                                ? 'danger'
                                                : a.severity === 'warning'
                                                  ? 'warning'
                                                  : 'default'
                                        }
                                    >
                                        {a.alert_type}
                                    </AdminBadge>
                                    {a.resolved && <AdminBadge tone="success">Resolved</AdminBadge>}
                                </div>
                                <p className="mt-1.5 text-[13px] text-slate-700">{a.message}</p>
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                    {new Date(a.created_at).toLocaleString()}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <TxDetailDrawer txId={selectedTx} onClose={() => setSelectedTx(null)} canRunOps={canManage} />
        </div>
    );
}
