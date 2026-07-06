'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, RefreshCw, ShieldOff, ShieldCheck, LogOut } from 'lucide-react';
import {
    AdminBadge,
    AdminErrorBanner,
    AdminLoading,
    AdminPageHeader,
    admin,
    txStatusTone,
} from '@/components/admin/admin-ui';
import { TxDetailDrawer } from '@/components/admin/TxDetailDrawer';

type UserDetail = {
    user: {
        id: string;
        email: string;
        phone: string;
        role: string;
        createdAt: string;
        wallet: string;
        kycTier: string;
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
    alerts: Array<{ id: string; alert_type: string; severity: string; message: string; resolved: boolean; created_at: string }>;
    merchant: { checkoutCount: number; apiKeys: Array<{ id: string; name: string; keyPrefix: string; revoked: boolean }> };
};

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
                <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                    <ArrowLeft className="h-4 w-4" /> Back to users
                </Link>
                <AdminErrorBanner message={error} />
            </div>
        );
    }

    const u = data!.user;

    return (
        <div className="space-y-6">
            <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4" /> Back to users
            </Link>

            <AdminPageHeader
                title={u.email}
                subtitle={`${u.phone} · joined ${new Date(u.createdAt).toLocaleDateString()}`}
                action={
                    <button type="button" onClick={load} className={admin.btnSecondary}>
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                }
            />

            {msg && <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm">{msg}</p>}

            <div className="flex flex-wrap gap-2">
                <AdminBadge tone={u.suspended ? 'danger' : 'success'}>{u.suspended ? 'Suspended' : 'Active'}</AdminBadge>
                <AdminBadge tone="info">KYC: {u.kycTier}</AdminBadge>
                <AdminBadge tone="default">Role: {u.role}</AdminBadge>
            </div>

            {u.suspended && u.suspendedReason && (
                <p className="text-sm text-red-700">Reason: {u.suspendedReason}</p>
            )}

            <div className={`${admin.card} p-4`}>
                <p className="text-xs font-semibold uppercase text-slate-400">Wallet</p>
                <code className="mt-1 block break-all text-xs text-slate-700">{u.wallet}</code>
            </div>

            {canManage && (
                <div className={`${admin.card} p-4 space-y-3`}>
                    <p className="text-sm font-semibold text-slate-800">Actions</p>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" className={admin.btnSecondary} onClick={() => action({ action: 'retry_stuck' })}>
                            Retry stuck ops
                        </button>
                        <button type="button" className={admin.btnSecondary} onClick={() => action({ action: 'force_logout' })}>
                            <LogOut className="h-4 w-4" /> Force logout
                        </button>
                        {u.suspended ? (
                            <button type="button" className={admin.btnPrimary} onClick={() => action({ action: 'unsuspend' })}>
                                <ShieldCheck className="h-4 w-4" /> Unsuspend
                            </button>
                        ) : (
                            <button
                                type="button"
                                className={admin.btnSecondary}
                                onClick={() => action({ action: 'suspend', reason: 'Suspended from admin' })}
                            >
                                <ShieldOff className="h-4 w-4" /> Suspend
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="text-sm text-slate-600">KYC tier</label>
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
                            <label className="text-sm text-slate-600">Admin role</label>
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
            )}

            {data!.merchant.checkoutCount > 0 && (
                <div className={`${admin.card} p-4`}>
                    <p className="font-semibold text-slate-800">Merchant</p>
                    <p className="text-sm text-slate-500">{data!.merchant.checkoutCount} checkouts · {data!.merchant.apiKeys.filter((k) => !k.revoked).length} active API keys</p>
                </div>
            )}

            <div className={admin.card}>
                <div className={admin.cardHeader}>
                    <h2 className="font-semibold text-slate-800">Recent transactions</h2>
                </div>
                <ul className="divide-y divide-slate-100">
                    {data!.transactions.map((tx) => (
                        <li
                            key={tx.id}
                            className="flex cursor-pointer items-center justify-between px-5 py-3 hover:bg-slate-50"
                            onClick={() => setSelectedTx(tx.id)}
                        >
                            <div>
                                <p className="text-sm font-medium">{tx.type} · {tx.amountXlm} {tx.asset.toUpperCase()}</p>
                                <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString()}</p>
                            </div>
                            <AdminBadge tone={txStatusTone(tx.status)}>{tx.status}</AdminBadge>
                        </li>
                    ))}
                </ul>
            </div>

            {data!.alerts.length > 0 && (
                <div className={admin.card}>
                    <div className={admin.cardHeader}>
                        <h2 className="font-semibold text-slate-800">Compliance alerts</h2>
                    </div>
                    <ul className="divide-y divide-slate-100 px-5 py-2 text-sm">
                        {data!.alerts.map((a) => (
                            <li key={a.id} className="py-2">
                                {a.alert_type} · {a.message}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <TxDetailDrawer txId={selectedTx} onClose={() => setSelectedTx(null)} canRunOps={canManage} />
        </div>
    );
}
