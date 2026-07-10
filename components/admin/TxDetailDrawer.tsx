'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, RefreshCw, X } from 'lucide-react';
import { AdminBadge, AdminErrorBanner, admin, txStatusTone } from '@/components/admin/admin-ui';

type TxDetail = {
    transaction: {
        id: string;
        type: string;
        asset: string;
        amountFiat: number;
        amountXlm: number;
        status: string;
        reference: string;
        txHash: string | null;
        depositMemo: string | null;
        operator?: string;
        createdAt: string;
        updatedAt: string;
    };
    user: { id: string; email: string; phone: string; wallet: string; kycTier: string };
    intents: Array<{ id: string; type: string; status: string; createdAt: string; confirmedAt?: string }>;
    lencoStatus: { status: string; amount?: number } | null;
    webhooks: Array<{ id: string; eventType: string; responseStatus: number | null; deliveredAt: string }>;
};

export function TxDetailDrawer({
    txId,
    onClose,
    onAction,
    canRunOps,
}: {
    txId: string | null;
    onClose: () => void;
    onAction?: () => void;
    canRunOps?: boolean;
}) {
    const [detail, setDetail] = useState<TxDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [actionMsg, setActionMsg] = useState('');

    const load = useCallback(() => {
        if (!txId) return;
        setLoading(true);
        setError('');
        fetch(`/api/admin/transactions/${txId}`)
            .then((r) => {
                if (!r.ok) throw new Error('Could not load details');
                return r.json();
            })
            .then(setDetail)
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
            .finally(() => setLoading(false));
    }, [txId]);

    useEffect(() => {
        if (txId) load();
        else setDetail(null);
    }, [txId, load]);

    const runAction = async (action: string, reason?: string) => {
        if (!txId) return;
        setActionMsg('');
        const res = await fetch(`/api/admin/transactions/${txId}/actions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, reason }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setActionMsg(data.error || 'Action failed');
            return;
        }
        setActionMsg(action === 'retry' ? `Retry result: ${data.result}` : 'Updated');
        load();
        onAction?.();
    };

    if (!txId) return null;

    const tx = detail?.transaction;

    return (
        <>
            <div className="fixed inset-0 z-40 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
            <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">Transaction detail</h2>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {loading && <p className="text-sm text-slate-500">Loading…</p>}
                    {error && <AdminErrorBanner message={error} />}
                    {actionMsg && (
                        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{actionMsg}</p>
                    )}
                    {tx && (
                        <>
                            <div className="flex items-center gap-2">
                                <AdminBadge tone={txStatusTone(tx.status)}>{tx.status}</AdminBadge>
                                <span className="font-medium text-slate-800">{tx.type}</span>
                            </div>
                            <dl className="space-y-2 text-sm">
                                <div>
                                    <dt className="text-slate-500">Amount</dt>
                                    <dd className="font-medium tabular-nums">
                                        {tx.amountXlm} {tx.asset.toUpperCase()} · ZMW {Number(tx.amountFiat).toFixed(2)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-slate-500">Reference</dt>
                                    <dd className="font-mono text-xs break-all">{tx.reference}</dd>
                                </div>
                                {tx.depositMemo && (
                                    <div>
                                        <dt className="text-slate-500">Memo</dt>
                                        <dd className="font-mono text-xs">{tx.depositMemo}</dd>
                                    </div>
                                )}
                                {tx.txHash && (
                                    <div>
                                        <dt className="text-slate-500">Stellar tx</dt>
                                        <dd>
                                            <a
                                                href={`https://stellar.expert/explorer/public/tx/${tx.txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[var(--brand-accent)] text-xs font-mono break-all"
                                            >
                                                {tx.txHash.slice(0, 16)}… <ExternalLink className="h-3 w-3 shrink-0" />
                                            </a>
                                        </dd>
                                    </div>
                                )}
                                {detail.lencoStatus && (
                                    <div>
                                        <dt className="text-slate-500">Lenco status</dt>
                                        <dd>{detail.lencoStatus.status}</dd>
                                    </div>
                                )}
                                <div>
                                    <dt className="text-slate-500">Created</dt>
                                    <dd>{new Date(tx.createdAt).toLocaleString()}</dd>
                                </div>
                            </dl>

                            {detail.user && (
                                <div className={`${admin.card} p-4`}>
                                    <p className="text-xs font-semibold uppercase text-slate-400">User</p>
                                    <p className="mt-1 text-sm font-medium">{detail.user.email}</p>
                                    <p className="text-sm text-slate-500">{detail.user.phone}</p>
                                    <Link
                                        href={`/admin/users/${detail.user.id}`}
                                        className="mt-2 inline-block text-sm text-[var(--brand-accent)]"
                                    >
                                        View user →
                                    </Link>
                                </div>
                            )}

                            {detail.intents.length > 0 && (
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Sign intents</p>
                                    <ul className="space-y-2 text-sm">
                                        {detail.intents.map((i) => (
                                            <li key={i.id} className="rounded-lg bg-slate-50 px-3 py-2">
                                                {i.type} · {i.status} · {new Date(i.createdAt).toLocaleString()}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {canRunOps && (tx.status === 'PENDING' || tx.status === 'PROCESSING') && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    <button
                                        type="button"
                                        className={admin.btnPrimary}
                                        onClick={() => runAction('retry')}
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Retry finalize
                                    </button>
                                    <button
                                        type="button"
                                        className={admin.btnSecondary}
                                        onClick={() => runAction('mark_failed', 'Admin marked failed')}
                                    >
                                        Mark failed
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </aside>
        </>
    );
}
