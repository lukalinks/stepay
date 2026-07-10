'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Search, Copy, Check } from 'lucide-react';
import {
    AdminBadge,
    AdminEmptyState,
    AdminErrorBanner,
    AdminLoading,
    AdminPageHeader,
    AdminPagination,
    admin,
} from '@/components/admin/admin-ui';

interface UserRow {
    id: string;
    email: string;
    phone: string;
    role: string;
    createdAt: string;
    wallet: string;
    walletShort: string;
    countryCode: string;
    kycTier: string;
}

const PAGE_SIZE = 50;

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const fetchUsers = useCallback((s: string, nextOffset: number) => {
        setLoading(true);
        setError('');
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(nextOffset) });
        if (s) params.set('search', s);
        fetch(`/api/admin/users?${params}`)
            .then((res) => {
                if (!res.ok) throw new Error('Could not load users');
                return res.json();
            })
            .then((data) => {
                setUsers(data.users);
                setTotal(data.total);
            })
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load users'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const t = setTimeout(() => fetchUsers(search, offset), search ? 300 : 0);
        return () => clearTimeout(t);
    }, [search, offset, fetchUsers]);

    const copyWallet = async (user: UserRow) => {
        if (!user.wallet) return;
        try {
            await navigator.clipboard.writeText(user.wallet);
            setCopiedId(user.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            // ignore
        }
    };

    return (
        <div className="space-y-6">
            <AdminPageHeader title="Users" subtitle={`${total.toLocaleString()} registered accounts`} />

            {error && <AdminErrorBanner message={error} />}

            <div className={admin.card}>
                <div className={admin.cardHeader}>
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by email or phone…"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setOffset(0);
                            }}
                            className={`${admin.input} pl-10`}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <AdminLoading />
                    ) : (
                        <table className="w-full min-w-[720px] text-sm">
                            <thead className="bg-slate-50/80 text-left">
                                <tr>
                                    <th className="px-5 py-3.5 font-semibold text-slate-600">Email</th>
                                    <th className="px-5 py-3.5 font-semibold text-slate-600">Phone</th>
                                    <th className="px-5 py-3.5 font-semibold text-slate-600">Country</th>
                                    <th className="px-5 py-3.5 font-semibold text-slate-600">KYC</th>
                                    <th className="px-5 py-3.5 font-semibold text-slate-600">Role</th>
                                    <th className="px-5 py-3.5 font-semibold text-slate-600">Wallet</th>
                                    <th className="px-5 py-3.5 font-semibold text-slate-600">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((u) => (
                                    <tr key={u.id} className="transition-colors hover:bg-slate-50/70">
                                        <td className="px-5 py-4 font-medium text-slate-800">
                                            <Link href={`/admin/users/${u.id}`} className="text-[var(--brand-accent)] hover:underline">
                                                {u.email || '—'}
                                            </Link>
                                        </td>
                                        <td className="px-5 py-4 text-slate-600">{u.phone || '—'}</td>
                                        <td className="px-5 py-4 text-slate-600">{u.countryCode}</td>
                                        <td className="px-5 py-4">
                                            <AdminBadge tone="default">{u.kycTier}</AdminBadge>
                                        </td>
                                        <td className="px-5 py-4">
                                            <AdminBadge tone={u.role === 'admin' ? 'info' : 'default'}>{u.role}</AdminBadge>
                                        </td>
                                        <td className="px-5 py-4">
                                            {u.wallet ? (
                                                <button
                                                    type="button"
                                                    onClick={() => copyWallet(u)}
                                                    className="inline-flex items-center gap-1 font-mono text-xs text-slate-600 hover:text-[var(--brand-accent)]"
                                                    title={u.wallet}
                                                >
                                                    {u.walletShort}
                                                    {copiedId === u.id ? (
                                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {!loading && users.length === 0 && <AdminEmptyState message="No users found. Try a different search." />}
                </div>
                <AdminPagination offset={offset} limit={PAGE_SIZE} total={total} onChange={setOffset} />
            </div>
        </div>
    );
}
