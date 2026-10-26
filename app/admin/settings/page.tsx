'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Message } from '@/components/Message';
import {
    AdminBadge,
    AdminLoading,
    AdminPageHeader,
    admin,
    adminTable,
} from '@/components/admin/admin-ui';
import { BackButton } from '@/components/BackButton';
import { canChangeSettings } from '@/lib/admin-roles';

type InviteRow = {
    id: string;
    email: string;
    phone?: string | null;
    status: string;
    created_at: string;
    whatsAppUrl?: string;
};

type WaitlistEntry = {
    id: string;
    email: string;
    created_at: string;
    notified_at: string | null;
};

function inviteStatusTone(status: string): 'success' | 'warning' | 'danger' | 'default' {
    if (status === 'accepted' || status === 'used') return 'success';
    if (status === 'pending') return 'warning';
    if (status === 'revoked' || status === 'expired') return 'danger';
    return 'default';
}

export default function AdminSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [forbidden, setForbidden] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<'success' | 'error' | null>(null);
    const [accessMsg, setAccessMsg] = useState<string | null>(null);
    const [inviteMsg, setInviteMsg] = useState<string | null>(null);
    const [publicLaunch, setPublicLaunch] = useState(true);
    const [inviteEmail, setInviteEmail] = useState('');
    const [invitePhone, setInvitePhone] = useState('');
    const [inviting, setInviting] = useState(false);
    const [invites, setInvites] = useState<InviteRow[]>([]);
    const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
    const [waitlistTotal, setWaitlistTotal] = useState(0);
    const [waitlistUnnotified, setWaitlistUnnotified] = useState(0);
    const [rates, setRates] = useState({
        xlm_buy: 3.5,
        xlm_sell: 3.5,
        usdc_buy: 25,
        usdc_sell: 25,
    });
    const [fees, setFees] = useState({ buy_percent: 0, sell_percent: 0 });
    const [limits, setLimits] = useState({
        min_deposit_zmw: 4,
        max_deposit_zmw: 50000,
        min_withdraw_zmw: 4,
        max_withdraw_zmw: 50000,
    });

    const loadAccessLists = useCallback(async () => {
        const [invRes, wlRes] = await Promise.all([
            fetch('/api/admin/invites'),
            fetch('/api/admin/waitlist'),
        ]);
        if (invRes.ok) {
            const data = await invRes.json();
            setInvites(Array.isArray(data.invites) ? data.invites : []);
        }
        if (wlRes.ok) {
            const data = await wlRes.json();
            setWaitlist(Array.isArray(data.entries) ? data.entries : []);
            setWaitlistTotal(Number(data.total) || 0);
            setWaitlistUnnotified(Number(data.unnotified) || 0);
        }
    }, []);

    useEffect(() => {
        fetch('/api/admin/stats')
            .then((r) => r.json())
            .then((stats) => {
                if (!canChangeSettings(stats.adminRole)) {
                    setForbidden(true);
                    setLoading(false);
                    return null;
                }
                return Promise.all([
                    fetch('/api/admin/settings').then((res) => {
                        if (!res.ok) throw new Error('Failed to load');
                        return res.json();
                    }),
                    loadAccessLists(),
                ]);
            })
            .then((result) => {
                if (!result) return;
                const [data] = result;
                if (data.rates) setRates(data.rates);
                if (data.fee) setFees(data.fee);
                if (data.limits) setLimits(data.limits);
                if (data.access && typeof data.access.publicLaunch === 'boolean') {
                    setPublicLaunch(data.access.publicLaunch);
                }
            })
            .catch(() => setMessage('error'))
            .finally(() => setLoading(false));
    }, [loadAccessLists]);

    const handleTogglePublic = async () => {
        const next = !publicLaunch;
        setAccessMsg(null);
        setSaving(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access: { publicLaunch: next } }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setAccessMsg(data.error || 'Could not update access setting.');
                return;
            }
            setPublicLaunch(next);
            if (next && data.waitlistNotify) {
                setAccessMsg(
                    `Platform is open to the public. Waitlist emails: ${data.waitlistNotify.sent} sent` +
                        (data.waitlistNotify.failed ? `, ${data.waitlistNotify.failed} failed` : '') +
                        '.'
                );
            } else if (next) {
                setAccessMsg('Platform is open to the public. Anyone can sign up.');
            } else {
                setAccessMsg('Closed beta on. Only invited emails can create accounts.');
            }
            await loadAccessLists();
        } catch {
            setAccessMsg('Could not update access setting.');
        } finally {
            setSaving(false);
        }
    };

    const deliverySummary = (data: {
        emailed?: boolean;
        whatsapped?: boolean;
        whatsAppUrl?: string;
        invite?: { email?: string; phone?: string | null };
    }) => {
        const parts: string[] = [];
        if (data.emailed) parts.push('email sent');
        else parts.push('email failed');
        if (data.invite?.phone || data.whatsapped) {
            parts.push(data.whatsapped ? 'WhatsApp sent' : 'WhatsApp API not sent (use Open WhatsApp)');
        }
        return parts.join(' · ');
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteMsg(null);
        setInviting(true);
        try {
            const res = await fetch('/api/admin/invites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: inviteEmail.trim(),
                    phone: invitePhone.trim() || undefined,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setInviteMsg(data.error || 'Could not send invite.');
                return;
            }
            setInviteEmail('');
            setInvitePhone('');
            setInviteMsg(
                `Invite for ${data.invite?.email || 'user'}: ${deliverySummary(data)}.`
            );
            await loadAccessLists();
        } catch {
            setInviteMsg('Could not send invite.');
        } finally {
            setInviting(false);
        }
    };

    const handleResend = async (id: string) => {
        setInviteMsg(null);
        const res = await fetch(`/api/admin/invites/${id}/resend`, { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setInviteMsg(data.error || 'Could not resend.');
            return;
        }
        setInviteMsg(`Invite resent: ${deliverySummary(data)}.`);
        await loadAccessLists();
    };

    const handleRevoke = async (id: string) => {
        setInviteMsg(null);
        const res = await fetch(`/api/admin/invites/${id}/revoke`, { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setInviteMsg(data.error || 'Could not revoke.');
            return;
        }
        setInviteMsg('Invite revoked.');
        await loadAccessLists();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rates: {
                        xlm_buy: Number(rates.xlm_buy),
                        xlm_sell: Number(rates.xlm_sell),
                        usdc_buy: Number(rates.usdc_buy),
                        usdc_sell: Number(rates.usdc_sell),
                    },
                    fee: {
                        buy_percent: Number(fees.buy_percent),
                        sell_percent: Number(fees.sell_percent),
                    },
                    limits: {
                        min_deposit_zmw: Number(limits.min_deposit_zmw),
                        max_deposit_zmw: Number(limits.max_deposit_zmw),
                        min_withdraw_zmw: Number(limits.min_withdraw_zmw),
                        max_withdraw_zmw: Number(limits.max_withdraw_zmw),
                    },
                }),
            });
            if (res.ok) {
                setMessage('success');
            } else {
                setMessage('error');
            }
        } catch {
            setMessage('error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <AdminLoading />;

    if (forbidden) {
        return (
            <div className="space-y-6 lg:space-y-8">
                <AdminPageHeader eyebrow="Platform" title="Settings" subtitle="Superadmin only" />
                <div className={`${admin.card} p-6`}>
                    <p className="text-[13px] text-slate-600">
                        You do not have permission to change platform settings.
                    </p>
                </div>
                <BackButton href="/admin" label="Back to dashboard" variant="light" />
            </div>
        );
    }

    return (
        <div className="space-y-6 lg:space-y-8">
            <AdminPageHeader eyebrow="Platform" title="Settings" subtitle="Access, rates, limits, and fees" />

            <div className={admin.card}>
                <div className="border-b border-slate-100/80 px-5 py-4">
                    <h2 className="text-sm font-semibold tracking-tight text-slate-900">Access</h2>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                        When closed beta is on, only invited emails can create accounts. Everyone else can join the
                        waitlist and is emailed when you open to the public.
                    </p>
                </div>
                <div className="space-y-6 p-5 sm:p-6">
                    {accessMsg && (
                        <Message variant="success" title="Access updated" role="status">
                            {accessMsg}
                        </Message>
                    )}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-[13px] font-semibold text-slate-800">Open to public</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                                {publicLaunch ? 'Anyone can sign up.' : 'Closed beta — invite only.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleTogglePublic}
                            disabled={saving}
                            className={publicLaunch ? admin.btnPrimary : admin.btnSecondary}
                        >
                            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {publicLaunch ? 'Public: ON' : 'Public: OFF'}
                        </button>
                    </div>

                    <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                            <label className="mb-1.5 block text-[11px] font-medium text-slate-500">Invite email</label>
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="friend@example.com"
                                required
                                className={admin.input}
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <label className="mb-1.5 block text-[11px] font-medium text-slate-500">
                                WhatsApp phone (optional)
                            </label>
                            <input
                                type="tel"
                                value={invitePhone}
                                onChange={(e) => setInvitePhone(e.target.value)}
                                placeholder="0977 123 456"
                                className={admin.input}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={inviting || !inviteEmail.includes('@')}
                            className={admin.btnPrimary}
                        >
                            {inviting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {inviting ? 'Sending…' : 'Send invite'}
                        </button>
                    </form>
                    <p className="text-[11px] text-slate-400">
                        Email always sends. With a phone: auto WhatsApp/SMS when configured, plus an Open WhatsApp
                        link you can use manually.
                    </p>
                    {inviteMsg && <p className="text-[13px] text-slate-600">{inviteMsg}</p>}

                    <div>
                        <h3 className="mb-3 text-sm font-semibold tracking-tight text-slate-900">Invites</h3>
                        {invites.length === 0 ? (
                            <p className="text-[13px] text-slate-500">No invites yet.</p>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200/70">
                                <table className="min-w-full text-left text-sm">
                                    <thead>
                                        <tr className={adminTable.head}>
                                            <th className={adminTable.thTight}>Email</th>
                                            <th className={adminTable.thTight}>Phone</th>
                                            <th className={adminTable.thTight}>Status</th>
                                            <th className={adminTable.th}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invites.map((inv) => (
                                            <tr key={inv.id} className={adminTable.row}>
                                                <td className={`${adminTable.tdTight} text-[13px] font-semibold text-slate-800`}>
                                                    {inv.email}
                                                </td>
                                                <td className={`${adminTable.tdTight} text-[13px] tabular-nums text-slate-600`}>
                                                    {inv.phone ? `+${inv.phone}` : '—'}
                                                </td>
                                                <td className={adminTable.tdTight}>
                                                    <AdminBadge tone={inviteStatusTone(inv.status)}>
                                                        {inv.status}
                                                    </AdminBadge>
                                                </td>
                                                <td className={adminTable.td}>
                                                    {inv.status === 'pending' && (
                                                        <div className="flex flex-wrap gap-3">
                                                            <button
                                                                type="button"
                                                                className="text-[12px] font-semibold text-[#8B7344] hover:text-[var(--brand-accent)]"
                                                                onClick={() => handleResend(inv.id)}
                                                            >
                                                                Resend
                                                            </button>
                                                            {inv.whatsAppUrl && (
                                                                <a
                                                                    href={inv.whatsAppUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-[12px] font-semibold text-[#8B7344] hover:text-[var(--brand-accent)]"
                                                                >
                                                                    Open WhatsApp
                                                                </a>
                                                            )}
                                                            <button
                                                                type="button"
                                                                className="text-[12px] font-semibold text-rose-600 hover:text-rose-700"
                                                                onClick={() => handleRevoke(inv.id)}
                                                            >
                                                                Revoke
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="mb-3 text-sm font-semibold tracking-tight text-slate-900">
                            Waitlist ({waitlistTotal}
                            {waitlistUnnotified > 0 ? `, ${waitlistUnnotified} not notified` : ''})
                        </h3>
                        {waitlist.length === 0 ? (
                            <p className="text-[13px] text-slate-500">No waitlist entries.</p>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200/70">
                                <table className="min-w-full text-left text-sm">
                                    <thead>
                                        <tr className={adminTable.head}>
                                            <th className={adminTable.thTight}>Email</th>
                                            <th className={adminTable.thTight}>Joined</th>
                                            <th className={adminTable.th}>Notified</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {waitlist.map((w) => (
                                            <tr key={w.id} className={adminTable.row}>
                                                <td className={`${adminTable.tdTight} text-[13px] font-semibold text-slate-800`}>
                                                    {w.email}
                                                </td>
                                                <td className={`${adminTable.tdTight} text-[12px] text-slate-500`}>
                                                    {new Date(w.created_at).toLocaleString()}
                                                </td>
                                                <td className={`${adminTable.td} text-[12px] text-slate-500`}>
                                                    {w.notified_at
                                                        ? new Date(w.notified_at).toLocaleString()
                                                        : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className={admin.card}>
                <div className="border-b border-slate-100/80 px-5 py-4">
                    <h2 className="text-sm font-semibold tracking-tight text-slate-900">Fees & rates</h2>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                        Live market rates are used in production (XLM/USDC via CoinGecko + USD/ZMW forex, with a
                        buy/sell spread). Values below are the manual fallback if live pricing is unavailable.
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">
                    {message === 'success' && (
                        <Message variant="success" title="Settings saved" role="status">
                            Your new rates and limits apply immediately for all users.
                        </Message>
                    )}
                    {message === 'error' && (
                        <Message variant="warning" title="Couldn't save changes">
                            Make sure you&apos;re signed in as an admin.
                        </Message>
                    )}

                    <div>
                        <h3 className="mb-3 text-sm font-semibold tracking-tight text-slate-800">
                            Rates (ZMW per unit)
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <label className="mb-1.5 block text-[11px] font-medium text-slate-500">XLM Buy</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={rates.xlm_buy}
                                    onChange={(e) => setRates({ ...rates, xlm_buy: parseFloat(e.target.value) || 0 })}
                                    className={admin.input}
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[11px] font-medium text-slate-500">XLM Sell</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={rates.xlm_sell}
                                    onChange={(e) => setRates({ ...rates, xlm_sell: parseFloat(e.target.value) || 0 })}
                                    className={admin.input}
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[11px] font-medium text-slate-500">USDC Buy</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={rates.usdc_buy}
                                    onChange={(e) => setRates({ ...rates, usdc_buy: parseFloat(e.target.value) || 0 })}
                                    className={admin.input}
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[11px] font-medium text-slate-500">USDC Sell</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={rates.usdc_sell}
                                    onChange={(e) => setRates({ ...rates, usdc_sell: parseFloat(e.target.value) || 0 })}
                                    className={admin.input}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="mb-1 text-sm font-semibold tracking-tight text-slate-800">
                            Deposit Limits (ZMW)
                        </h3>
                        <p className="mb-3 text-[11px] text-slate-400">Min and max ZMW allowed per deposit.</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-[11px] font-medium text-slate-500">
                                    Min deposit (ZMW)
                                </label>
                                <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    value={limits.min_deposit_zmw}
                                    onChange={(e) =>
                                        setLimits({ ...limits, min_deposit_zmw: parseFloat(e.target.value) || 1 })
                                    }
                                    className={admin.input}
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[11px] font-medium text-slate-500">
                                    Max deposit (ZMW)
                                </label>
                                <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    value={limits.max_deposit_zmw}
                                    onChange={(e) =>
                                        setLimits({
                                            ...limits,
                                            max_deposit_zmw: parseFloat(e.target.value) || 50000,
                                        })
                                    }
                                    className={admin.input}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="mb-1 text-sm font-semibold tracking-tight text-slate-800">
                            Withdraw Limits (ZMW)
                        </h3>
                        <p className="mb-3 text-[11px] text-slate-400">Min and max ZMW payout per cash out.</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-[11px] font-medium text-slate-500">
                                    Min withdraw (ZMW)
                                </label>
                                <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    value={limits.min_withdraw_zmw}
                                    onChange={(e) =>
                                        setLimits({ ...limits, min_withdraw_zmw: parseFloat(e.target.value) || 1 })
                                    }
                                    className={admin.input}
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[11px] font-medium text-slate-500">
                                    Max withdraw (ZMW)
                                </label>
                                <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    value={limits.max_withdraw_zmw}
                                    onChange={(e) =>
                                        setLimits({
                                            ...limits,
                                            max_withdraw_zmw: parseFloat(e.target.value) || 50000,
                                        })
                                    }
                                    className={admin.input}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="mb-1 text-sm font-semibold tracking-tight text-slate-800">Fee (%)</h3>
                        <p className="mb-3 text-[11px] text-slate-400">
                            Percentage taken from user&apos;s crypto (buy) or ZMW (sell).
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-[11px] font-medium text-slate-500">Buy fee %</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={fees.buy_percent}
                                    onChange={(e) => setFees({ ...fees, buy_percent: parseFloat(e.target.value) || 0 })}
                                    className={admin.input}
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[11px] font-medium text-slate-500">Sell fee %</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={fees.sell_percent}
                                    onChange={(e) =>
                                        setFees({ ...fees, sell_percent: parseFloat(e.target.value) || 0 })
                                    }
                                    className={admin.input}
                                />
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={saving} className={admin.btnPrimary}>
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {saving ? 'Saving...' : 'Save changes'}
                    </button>
                </form>
            </div>
        </div>
    );
}
