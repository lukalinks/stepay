'use client';

import { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, ArrowDownUp, Send, ChevronDown, ChevronUp, ExternalLink, Copy } from 'lucide-react';

export type TxRow = {
    id: string;
    type: string;
    asset: string;
    amountXLM: number;
    amountFiat: number;
    status: string;
    reference: string;
    txHash: string | null;
    createdAt: string;
    depositMemo?: string;
};

function formatStatus(status: string, type?: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'COMPLETED') return 'Completed';
    if (s === 'FAILED') return 'Failed';
    if (s === 'PROCESSING') return 'Processing';
    if (s === 'PENDING' && type === 'BUY') return 'Awaiting payment';
    if (s === 'PENDING' && type === 'SWAP') return 'Processing';
    if (s === 'PENDING') return 'Pending';
    return status || 'Pending';
}

function formatCryptoAmount(amount: number, asset: string): string {
    const n = Number(amount) || 0;
    if (asset === 'usdc') return n.toFixed(2);
    if (n >= 1) return parseFloat(n.toFixed(4)).toString();
    if (n >= 0.0001) return parseFloat(n.toFixed(6)).toString();
    return n.toFixed(7);
}

function formatDate(iso: string, compact = false) {
    const d = new Date(iso);
    if (compact) {
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleString();
}

const typeStyles = {
    BUY: 'bg-[var(--brand-accent)]/15 text-[var(--brand-accent)] ring-1 ring-[var(--brand-accent)]/25',
    SEND: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/25',
    RECEIVE: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25',
    SELL: 'bg-white/10 text-white/80 ring-1 ring-white/15',
    SWAP: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/25',
};

const amountColor = {
    BUY: 'text-[var(--brand-accent)]',
    SEND: 'text-violet-300',
    RECEIVE: 'text-emerald-300',
    SELL: 'text-white/90',
    SWAP: 'text-sky-300',
};

const statusStyles = (status: string) =>
    status === 'COMPLETED'
        ? 'text-[var(--brand-accent)]'
        : status === 'FAILED'
          ? 'text-red-400'
          : 'text-amber-400';

function TxIcon({ type }: { type: string }) {
    const cls = 'h-4 w-4';
    if (type === 'BUY') return <ArrowDownLeft className={cls} />;
    if (type === 'RECEIVE') return <ArrowDownLeft className={cls} />;
    if (type === 'SEND') return <Send className={cls} />;
    if (type === 'SWAP') return <ArrowDownUp className={cls} />;
    return <ArrowUpRight className={cls} />;
}

export function TransactionRow({ tx }: { tx: TxRow }) {
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    const assetLabel = tx.asset === 'usdc' ? 'USDC' : 'XLM';
    const fromAsset = tx.asset === 'usdc' ? 'xlm' : 'usdc';
    const fromAssetLabel = fromAsset === 'usdc' ? 'USDC' : 'XLM';
    const typeLabel =
        tx.type === 'BUY'
            ? 'Deposited'
            : tx.type === 'RECEIVE'
              ? 'Received'
              : tx.type === 'SEND'
              ? 'Sent'
              : tx.type === 'SWAP'
                ? 'Swapped'
                : 'Cashed Out';
    const typeKey = (tx.type as keyof typeof typeStyles) in typeStyles ? (tx.type as keyof typeof typeStyles) : 'SELL';

    const title =
        tx.type === 'SWAP'
            ? `${typeLabel} ${formatCryptoAmount(Number(tx.amountFiat), fromAsset)} ${fromAssetLabel} → ${formatCryptoAmount(tx.amountXLM, tx.asset)} ${assetLabel}`
            : `${typeLabel} ${formatCryptoAmount(tx.amountXLM, tx.asset)} ${assetLabel}`;

    const amountDisplay =
        tx.type === 'SWAP'
            ? `${formatCryptoAmount(tx.amountXLM, tx.asset)} ${assetLabel}`
            : `${tx.type === 'BUY' || tx.type === 'RECEIVE' ? '+' : '-'}${formatCryptoAmount(tx.amountXLM, tx.asset)} ${assetLabel}`;

    const copyHash = async () => {
        if (tx.txHash && navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(tx.txHash);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch {
                /* ignore */
            }
        }
    };

    return (
        <div className="border-b border-white/[0.06] last:border-b-0">
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="mx-0.5 my-0.5 w-full rounded-xl px-3 py-3 text-left transition-all duration-200 hover:bg-white/[0.04] hover:ring-1 hover:ring-white/[0.06] active:bg-white/[0.06] sm:px-4 sm:py-2.5"
            >
                <div className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 rounded-lg p-2 ${typeStyles[typeKey]}`}>
                        <TxIcon type={tx.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug text-white line-clamp-2 sm:truncate">{title}</p>
                        <p className="mt-1 text-[0.6875rem] text-white/45 sm:hidden">
                            {formatDate(tx.createdAt, true)} ·{' '}
                            <span className={statusStyles(tx.status)}>{formatStatus(tx.status, tx.type)}</span>
                        </p>
                        <p className="mt-1 hidden text-[0.6875rem] text-white/45 sm:block">{formatDate(tx.createdAt)}</p>
                    </div>
                    <div className="hidden shrink-0 items-center gap-2 sm:flex">
                        <div className="text-right">
                            <p className={`text-sm font-bold tabular-nums ${amountColor[typeKey]}`}>
                                {tx.type === 'SWAP' ? amountDisplay.replace(/^[+-]/, '') : amountDisplay}
                            </p>
                            <p className={`mt-0.5 text-[0.6875rem] font-medium ${statusStyles(tx.status)}`}>
                                {formatStatus(tx.status, tx.type)}
                            </p>
                        </div>
                        {expanded ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-white/35" />
                        ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-white/35" />
                        )}
                    </div>
                    <div className="shrink-0 sm:hidden">
                        {expanded ? (
                            <ChevronUp className="h-4 w-4 text-white/35" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-white/35" />
                        )}
                    </div>
                </div>
                <div className="mt-2 flex items-center justify-between pl-11 sm:hidden">
                    <p className={`text-sm font-bold tabular-nums ${amountColor[typeKey]}`}>
                        {tx.type === 'SWAP' ? amountDisplay : amountDisplay}
                    </p>
                </div>
            </button>
            {expanded && (
                <div className="mx-0.5 mb-0.5 space-y-2 rounded-b-lg bg-white/[0.03] px-3 pb-3 pt-1 sm:px-4">
                    <div className="grid gap-2 text-xs">
                        <div className="flex justify-between gap-3 py-1">
                            <span className="shrink-0 text-white/45">Local amount</span>
                            <span className="font-semibold text-white/90 tabular-nums">{Number(tx.amountFiat).toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col gap-1 py-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                            <span className="text-white/45">Reference</span>
                            <code
                                className="break-all rounded-md border border-white/[0.08] bg-black/30 px-2 py-1 font-mono text-[0.6875rem] text-white/80 sm:max-w-[200px] sm:truncate"
                                title={tx.reference}
                            >
                                {tx.reference}
                            </code>
                        </div>
                        {tx.depositMemo && (
                            <div className="flex flex-col gap-1 py-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                <span className="text-white/45">Memo</span>
                                <code className="rounded-md border border-white/[0.08] bg-black/30 px-2 py-1 font-mono text-[0.6875rem] text-white/80">
                                    {tx.depositMemo}
                                </code>
                            </div>
                        )}
                        <div className="flex flex-col gap-2 py-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                            <span className="text-white/45">Blockchain Hash</span>
                            {tx.txHash ? (
                                <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                                    <code
                                        className="min-w-0 flex-1 break-all rounded-md border border-white/[0.08] bg-black/30 px-2 py-1 font-mono text-[0.6875rem] text-white/80 sm:max-w-none sm:flex-none"
                                        title={tx.txHash}
                                    >
                                        {tx.txHash.slice(0, 12)}...{tx.txHash.slice(-8)}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copyHash();
                                        }}
                                        className="flex h-10 w-10 items-center justify-center rounded-md border border-white/[0.08] transition-colors hover:bg-white/[0.08] active:bg-white/[0.12]"
                                        title="Copy hash"
                                    >
                                        <Copy className="h-3.5 w-3.5 text-white/60" />
                                    </button>
                                    <a
                                        href={`https://stellar.expert/explorer/public/tx/${tx.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex h-10 w-10 items-center justify-center rounded-md border border-white/[0.08] text-[var(--brand-accent)] transition-colors hover:bg-[var(--brand-accent)]/10 active:bg-[var(--brand-accent)]/15"
                                        title="View on Stellar Explorer"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                </div>
                            ) : (
                                <span className="text-[0.6875rem] text-white/30">—</span>
                            )}
                        </div>
                        <div className="flex justify-between gap-3 py-1 sm:hidden">
                            <span className="text-white/45">Date</span>
                            <span className="text-right font-medium text-white/75">{formatDate(tx.createdAt)}</span>
                        </div>
                    </div>
                    {copied && (
                        <p className="flex items-center gap-1 text-[0.6875rem] font-semibold text-[var(--brand-accent)]">Hash copied!</p>
                    )}
                </div>
            )}
        </div>
    );
}
