'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, UserPlus, Trash2, Copy, Check } from 'lucide-react';
import { Message } from '@/components/Message';
import {
    AdminBadge,
    AdminEmptyState,
    AdminLoading,
    AdminPageHeader,
    admin,
    adminTable,
} from '@/components/admin/admin-ui';
import {
    ASSIGNABLE_ADMIN_ROLES,
    adminRoleDescription,
    adminRoleLabel,
    canManageTeam,
} from '@/lib/admin-roles';

type TeamMember = {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
    roleLabel: string;
    createdAt: string;
    suspended: boolean;
    hasPassword: boolean;
    isYou: boolean;
};

function initials(name: string | null, email: string) {
    const base = (name || email || '?').trim();
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return base.slice(0, 2).toUpperCase();
}

function roleTone(role: string): 'info' | 'warning' | 'default' {
    if (role === 'admin') return 'info';
    if (role === 'admin_ops' || role === 'admin_support') return 'warning';
    return 'default';
}

export default function AdminTeamPage() {
    const [loading, setLoading] = useState(true);
    const [forbidden, setForbidden] = useState(false);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<string>('admin_support');
    const [inviting, setInviting] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [tempPassword, setTempPassword] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const load = useCallback(async () => {
        const res = await fetch('/api/admin/team');
        if (res.status === 403) {
            setForbidden(true);
            return;
        }
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Failed to load team');
        }
        const data = await res.json();
        setMembers(Array.isArray(data.members) ? data.members : []);
    }, []);

    useEffect(() => {
        fetch('/api/admin/stats')
            .then((r) => r.json())
            .then((stats) => {
                if (!canManageTeam(stats.adminRole)) {
                    setForbidden(true);
                    setLoading(false);
                    return null;
                }
                return load();
            })
            .catch(() => setError('Could not load team.'))
            .finally(() => setLoading(false));
    }, [load]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setTempPassword(null);
        setInviting(true);
        try {
            const res = await fetch('/api/admin/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role, fullName: fullName || undefined }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error || 'Invite failed');
                return;
            }
            setEmail('');
            setFullName('');
            setRole('admin_support');
            if (data.temporaryPassword) {
                setTempPassword(data.temporaryPassword);
                setSuccess(
                    `Added ${data.member?.email || 'admin'}. Email delivery failed — copy the temporary password below.`
                );
            } else {
                setSuccess(
                    data.created
                        ? `Invite sent to ${data.member?.email}. They can sign in with Team password on the admin login page.`
                        : `Updated ${data.member?.email} to ${adminRoleLabel(data.member?.role || role)}.`
                );
            }
            await load();
        } catch {
            setError('Could not invite admin.');
        } finally {
            setInviting(false);
        }
    };

    const handleRoleChange = async (id: string, nextRole: string) => {
        setError(null);
        setSuccess(null);
        setBusyId(id);
        try {
            const res = await fetch(`/api/admin/team/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: nextRole }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error || 'Could not update role');
                await load();
                return;
            }
            setSuccess('Role updated. Their other sessions were signed out.');
            await load();
        } catch {
            setError('Could not update role.');
        } finally {
            setBusyId(null);
        }
    };

    const handleRevoke = async (member: TeamMember) => {
        if (member.isYou) return;
        if (!window.confirm(`Remove ${member.email} from the admin team?`)) return;
        setError(null);
        setSuccess(null);
        setBusyId(member.id);
        try {
            const res = await fetch(`/api/admin/team/${member.id}`, { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error || 'Could not remove member');
                return;
            }
            setSuccess(`${member.email} removed from the team.`);
            await load();
        } catch {
            setError('Could not remove member.');
        } finally {
            setBusyId(null);
        }
    };

    const copyTemp = async () => {
        if (!tempPassword) return;
        try {
            await navigator.clipboard.writeText(tempPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* ignore */
        }
    };

    if (loading) return <AdminLoading />;

    if (forbidden) {
        return (
            <div className="space-y-6 lg:space-y-8">
                <AdminPageHeader eyebrow="Access" title="Team" subtitle="Manage admin access" />
                <div className={`${admin.card} p-6`}>
                    <p className="text-[13px] text-slate-600">Only superadmins can manage the admin team.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 lg:space-y-8">
            <AdminPageHeader
                eyebrow="Access"
                title="Team"
                subtitle="Invite admins and assign Superadmin, Ops, or Support roles"
            />

            {error && (
                <Message variant="error" title="Something went wrong">
                    {error}
                </Message>
            )}
            {success && (
                <Message variant="success" title="Done" role="status">
                    {success}
                </Message>
            )}

            {tempPassword && (
                <div className={`${admin.card} border-amber-200 bg-amber-50/90 p-5`}>
                    <p className="text-sm font-semibold text-amber-900">Temporary password</p>
                    <p className="mt-1 text-[13px] text-amber-800">
                        Share this once securely. They should reset it after first login.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <code className="rounded-xl bg-white px-3 py-2 font-mono text-[13px] text-slate-900 shadow-sm ring-1 ring-amber-100">
                            {tempPassword}
                        </code>
                        <button type="button" className={admin.btnSecondary} onClick={copyTemp}>
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                </div>
            )}

            <div className={admin.card}>
                <div className="border-b border-slate-100/80 px-5 py-4">
                    <h2 className="text-sm font-semibold tracking-tight text-slate-900">Invite admin</h2>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                        New accounts get a temporary password by email. Existing accounts keep theirs (or get one if
                        they had none).
                    </p>
                </div>
                <form onSubmit={handleInvite} className="space-y-4 p-5 sm:p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={admin.input}
                                placeholder="ops@company.com"
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                                Name <span className="font-normal text-slate-400">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className={admin.input}
                                placeholder="Jane Doe"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Role</label>
                        <select
                            className={`${admin.select} w-full sm:w-auto`}
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                        >
                            {ASSIGNABLE_ADMIN_ROLES.map((r) => (
                                <option key={r} value={r}>
                                    {adminRoleLabel(r)} — {adminRoleDescription(r)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" className={admin.btnPrimary} disabled={inviting}>
                        {inviting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                        )}
                        {inviting ? 'Inviting…' : 'Add to team'}
                    </button>
                </form>
            </div>

            <div className={admin.card}>
                <div className="border-b border-slate-100/80 px-5 py-4">
                    <h2 className="text-sm font-semibold tracking-tight text-slate-900">Members</h2>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                        {members.length} admin{members.length === 1 ? '' : 's'}
                    </p>
                </div>
                {members.length === 0 ? (
                    <AdminEmptyState message="No team members yet." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead>
                                <tr className={adminTable.head}>
                                    <th className={adminTable.th}>Member</th>
                                    <th className={adminTable.thTight}>Role</th>
                                    <th className={adminTable.thTight}>Status</th>
                                    <th className={adminTable.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((m) => (
                                    <tr key={m.id} className={adminTable.row}>
                                        <td className={adminTable.td}>
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-accent-muted)] text-[11px] font-semibold text-[#8B7344]">
                                                    {initials(m.fullName, m.email)}
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block truncate text-[13px] font-semibold text-slate-900">
                                                        {m.fullName || m.email}
                                                        {m.isYou && (
                                                            <span className="ml-2 text-[11px] font-semibold text-slate-400">
                                                                you
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="block truncate text-[11px] text-slate-400">
                                                        {m.email}
                                                    </span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className={adminTable.tdTight}>
                                            <AdminBadge tone={roleTone(m.role)}>
                                                {adminRoleLabel(m.role)}
                                            </AdminBadge>
                                        </td>
                                        <td className={adminTable.tdTight}>
                                            {m.suspended ? (
                                                <AdminBadge tone="danger">Suspended</AdminBadge>
                                            ) : (
                                                <AdminBadge tone="success">Active</AdminBadge>
                                            )}
                                        </td>
                                        <td className={adminTable.td}>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <select
                                                    className={admin.select}
                                                    value={m.role}
                                                    disabled={busyId === m.id || m.isYou}
                                                    onChange={(e) => handleRoleChange(m.id, e.target.value)}
                                                    title={
                                                        m.isYou
                                                            ? 'You cannot change your own role here'
                                                            : undefined
                                                    }
                                                >
                                                    {ASSIGNABLE_ADMIN_ROLES.map((r) => (
                                                        <option key={r} value={r}>
                                                            {adminRoleLabel(r)}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    className={`${admin.btnSecondary} text-rose-700 hover:bg-rose-50`}
                                                    disabled={busyId === m.id || m.isYou}
                                                    onClick={() => handleRevoke(m)}
                                                    title={
                                                        m.isYou
                                                            ? 'You cannot remove yourself'
                                                            : 'Remove from team'
                                                    }
                                                >
                                                    {busyId === m.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                                                    )}
                                                    Remove
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className={`${admin.card} p-5 sm:p-6`}>
                <h3 className="text-sm font-semibold tracking-tight text-slate-900">Role guide</h3>
                <ul className="mt-3 space-y-2 text-[13px] text-slate-600">
                    {ASSIGNABLE_ADMIN_ROLES.map((r) => (
                        <li key={r}>
                            <span className="font-semibold text-slate-800">{adminRoleLabel(r)}</span>
                            {' — '}
                            {adminRoleDescription(r)}
                        </li>
                    ))}
                </ul>
                <p className="mt-4 text-[13px] text-slate-500">
                    Ops and Support sign in at the admin login page with <strong>Team password</strong>. The
                    platform superadmin email continues to use a one-time code.
                </p>
            </div>
        </div>
    );
}
