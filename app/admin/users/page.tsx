'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search,
    Copy,
    Check,
    RefreshCw,
    Users,
    ShieldCheck,
    ShieldOff,
    UserPlus,
    ExternalLink,
    Filter,
} from 'lucide-react';
import {
    AdminBadge,
    AdminEmptyState,
    AdminErrorBanner,
    AdminLoading,
    AdminPagination,
    admin,
} from '@/components/admin/admin-ui';
import { adminRoleLabel } from '@/lib/admin-roles';
import { getMarket } from '@/lib/markets';

interface UserRow {
    id: string;
    email: string;
    phone: string;
    fullName: string;
    role: string;
    createdAt: string;
    wallet: string;
    walletShort: string;
    countryCode: string;
    kycTier: string;
    suspended: boolean;
    avatarUrl?: string | null;
}

type Summary = {
    total: number;
    verified: number;
    suspended: number;
    new7d: number;
    staff: number;
};

const PAGE_SIZE = 50;

function initials(name: string, email: string) {
    const base = (name || email || '?').trim();
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return base.slice(0, 2).toUpperCase();
}

function relativeJoined(iso: string) {
    const ms = Date.now() - new Date(iso).getTime();
    const days = Math.floor(ms / 86400000);
    if (days < 1) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function roleTone(role: string): 'info' | 'warning' | 'default' {
    if (role === 'admin') return 'info';
    if (role === 'admin_ops' || role === 'admin_support') return 'warning';
    return 'default';
}

function roleLabel(role: string) {
    if (role === 'user') return 'User';
    return adminRoleLabel(role);
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [total, setTotal] = useState(0);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [countries, setCountries] = useState<Array<{ code: string; count: number }>>([]);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [kyc, setKyc] = useState('');
    const [role, setRole] = useState('');
    const [country, setCountry] = useState('');
    const [status, setStatus] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const fetchUsers = useCallback(() => {
        setLoading(true);
        setError('');
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
        if (search.trim()) params.set('search', search.trim());
        if (kyc) params.set('kyc', kyc);
        if (role) params.set('role', role);
        if (country) params.set('country', country);
        if (status) params.set('status', status);
        fetch(`/api/admin/users?${params}`)
            .then((res) => {
                if (!res.ok) throw new Error('Could not load users');
                return res.json();
            })
            .then((data) => {
                setUsers(data.users || []);
                setTotal(Number(data.total) || 0);
                setSummary(data.summary || null);
                setCountries(Array.isArray(data.countries) ? data.countries : []);
            })
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load users'))
            .finally(() => setLoading(false));
    }, [search, offset, kyc, role, country, status]);

    useEffect(() => {
        const t = setTimeout(() => fetchUsers(), search ? 280 : 0);
        return () => clearTimeout(t);
    }, [fetchUsers, search]);

    const copyWallet = async (user: UserRow, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user.wallet) return;
        try {
            await navigator.clipboard.writeText(user.wallet);
            setCopiedId(user.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            // ignore
        }
    };

    const verifiedPct = useMemo(() => {
        if (!summary?.total) return 0;
        return Math.round((summary.verified / summary.total) * 100);
    }, [summary]);

    const filtersActive = Boolean(kyc || role || country || status || search.trim());

    const clearFilters = () => {
        setSearch('');
        setKyc('');
        setRole('');
        setCountry('');
        setStatus('');
        setOffset(0);
    };

    return (
        <div className="space-y-6 lg:space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Directory
                    </p>
                    <h1 className={admin.pageTitle}>Users</h1>
                    <p className={admin.pageSubtitle}>
                        {total.toLocaleString()} matching · {(summary?.total ?? total).toLocaleString()} total accounts
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link href="/admin/reports" className={admin.btnSecondary}>
                        Export
                    </Link>
                    <button type="button" onClick={fetchUsers} disabled={loading} className={admin.btnSecondary}>
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                        Refresh
                    </button>
                </div>
            </div>

            {error && <AdminErrorBanner message={error} />}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className={`${admin.card} p-3.5`}>
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-medium text-slate-500">Total users</p>
                        <div className="rounded-lg bg-[var(--brand-accent-muted)] p-1.5 text-[var(--brand-accent)] ring-1 ring-inset ring-black/[0.03]">
                            <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                        {(summary?.total ?? total).toLocaleString()}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">{summary?.staff ?? 0} staff accounts</p>
                </div>
                <div className={`${admin.card} p-3.5`}>
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-medium text-slate-500">KYC verified</p>
                        <div className="rounded-lg bg-emerald-50/80 p-1.5 text-emerald-700 ring-1 ring-inset ring-black/[0.03]">
                            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                        {(summary?.verified ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">{verifiedPct}% of users</p>
                </div>
                <div className={`${admin.card} p-3.5`}>
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-medium text-slate-500">Suspended</p>
                        <div className="rounded-lg bg-rose-50/80 p-1.5 text-rose-700 ring-1 ring-inset ring-black/[0.03]">
                            <ShieldOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                        {(summary?.suspended ?? 0).toLocaleString()}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setStatus('suspended');
                            setOffset(0);
                        }}
                        className="mt-2 text-[11px] font-semibold text-[#8B7344] hover:text-[var(--brand-accent)]"
                    >
                        View suspended →
                    </button>
                </div>
                <div className={`${admin.card} p-3.5`}>
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-medium text-slate-500">New (7 days)</p>
                        <div className="rounded-lg bg-sky-50/80 p-1.5 text-sky-700 ring-1 ring-inset ring-black/[0.03]">
                            <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                        {(summary?.new7d ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">Signups this week</p>
                </div>
            </div>

            <div className={admin.card}>
                <div className="space-y-3 border-b border-slate-100/80 px-5 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                placeholder="Search name, email, or phone…"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setOffset(0);
                                }}
                                className={`${admin.input} pl-10`}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                                <Filter className="h-3.5 w-3.5" /> Filters
                            </span>
                            <select
                                value={kyc}
                                onChange={(e) => {
                                    setKyc(e.target.value);
                                    setOffset(0);
                                }}
                                className={admin.select}
                                aria-label="KYC filter"
                            >
                                <option value="">All KYC</option>
                                <option value="verified">Verified</option>
                                <option value="basic">Basic / pending</option>
                            </select>
                            <select
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    setOffset(0);
                                }}
                                className={admin.select}
                                aria-label="Status filter"
                            >
                                <option value="">All statuses</option>
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                            </select>
                            <select
                                value={role}
                                onChange={(e) => {
                                    setRole(e.target.value);
                                    setOffset(0);
                                }}
                                className={admin.select}
                                aria-label="Role filter"
                            >
                                <option value="">All roles</option>
                                <option value="user">User</option>
                                <option value="admin_support">Support</option>
                                <option value="admin_ops">Ops</option>
                                <option value="admin">Superadmin</option>
                            </select>
                            <select
                                value={country}
                                onChange={(e) => {
                                    setCountry(e.target.value);
                                    setOffset(0);
                                }}
                                className={admin.select}
                                aria-label="Country filter"
                            >
                                <option value="">All countries</option>
                                {countries.map((c) => {
                                    const market = getMarket(c.code);
                                    return (
                                        <option key={c.code} value={c.code}>
                                            {market.flagEmoji} {market.countryName} ({c.count})
                                        </option>
                                    );
                                })}
                            </select>
                            {filtersActive && (
                                <button type="button" onClick={clearFilters} className="text-[12px] font-semibold text-slate-500 hover:text-slate-800">
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading && users.length === 0 ? (
                        <AdminLoading />
                    ) : (
                        <table className="w-full min-w-[960px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-[0.08em] text-slate-400">
                                    <th className="px-5 py-3 font-medium">User</th>
                                    <th className="px-4 py-3 font-medium">Phone</th>
                                    <th className="px-4 py-3 font-medium">Country</th>
                                    <th className="px-4 py-3 font-medium">KYC</th>
                                    <th className="px-4 py-3 font-medium">Role</th>
                                    <th className="px-4 py-3 font-medium">Wallet</th>
                                    <th className="px-5 py-3 font-medium">Joined</th>
                                    <th className="px-4 py-3 font-medium" />
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => {
                                    const market = getMarket(u.countryCode);
                                    const displayName = u.fullName || u.email || 'Unknown';
                                    return (
                                        <tr
                                            key={u.id}
                                            className="border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70"
                                        >
                                            <td className="px-5 py-3.5">
                                                <Link href={`/admin/users/${u.id}`} className="group flex items-center gap-3">
                                                    {u.avatarUrl ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={u.avatarUrl}
                                                            alt=""
                                                            className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-100"
                                                        />
                                                    ) : (
                                                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-accent-muted)] text-[11px] font-semibold text-[#8B7344]">
                                                            {initials(u.fullName, u.email)}
                                                        </span>
                                                    )}
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-[13px] font-semibold text-slate-900 group-hover:text-[#8B7344]">
                                                            {displayName}
                                                        </span>
                                                        <span className="block truncate text-[11px] text-slate-400">
                                                            {u.fullName ? u.email || '—' : u.id.slice(0, 8)}
                                                        </span>
                                                    </span>
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3.5 text-[13px] tabular-nums text-slate-600">
                                                {u.phone || '—'}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-600">
                                                    <span aria-hidden>{market.flagEmoji}</span>
                                                    {u.countryCode}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <AdminBadge tone={u.kycTier === 'verified' ? 'success' : 'warning'}>
                                                    {u.kycTier === 'verified' ? 'Verified' : 'Basic'}
                                                </AdminBadge>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <AdminBadge tone={roleTone(u.role)}>{roleLabel(u.role)}</AdminBadge>
                                                    {u.suspended && <AdminBadge tone="danger">Suspended</AdminBadge>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {u.wallet ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => copyWallet(u, e)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-600 ring-1 ring-inset ring-slate-100 transition hover:text-[#8B7344]"
                                                        title={u.wallet}
                                                    >
                                                        {u.walletShort}
                                                        {copiedId === u.id ? (
                                                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="h-3.5 w-3.5 opacity-60" />
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-[12px] text-slate-500" title={new Date(u.createdAt).toLocaleString()}>
                                                {relativeJoined(u.createdAt)}
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <Link
                                                    href={`/admin/users/${u.id}`}
                                                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#8B7344] hover:text-[var(--brand-accent)]"
                                                >
                                                    Open
                                                    <ExternalLink className="h-3 w-3 opacity-60" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                    {!loading && users.length === 0 && (
                        <AdminEmptyState message="No users match your filters. Try clearing search or filters." />
                    )}
                </div>
                <AdminPagination offset={offset} limit={PAGE_SIZE} total={total} onChange={setOffset} />
            </div>
        </div>
    );
}
