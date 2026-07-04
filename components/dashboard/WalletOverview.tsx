'use client';

import { useState } from 'react';
import { ChevronDown, Copy, Check, DollarSign } from 'lucide-react';
import { WalletBalanceChart } from './WalletBalanceChart';
import { AssetIcon } from '@/components/AssetIcon';
import { assetDisplayLabel } from '@/lib/assets';
import { dash } from '@/lib/dashboard-ui';

interface WalletOverviewProps {
    portfolioLocal: string;
    localCurrency: string;
    walletAddr: string;
    balance: {
        xlm: number | string;
        usdc: number | string;
        xlmLocalEquiv?: number | string;
        usdcLocalEquiv?: number | string;
        xlmZmwEquiv?: number | string;
        usdcZmwEquiv?: number | string;
        usdPrimary?: string;
        fiatTotal?: string;
        zmwTotal?: string;
    };
    todayChange?: { percent: number; amount: number } | null;
}

function truncateAddress(addr: string) {
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 4)}…${addr.slice(-6)}`;
}

function formatNum(n: number, decimals = 2) {
    return Number(n).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

export function WalletOverview({ portfolioLocal, localCurrency, walletAddr, balance, todayChange }: WalletOverviewProps) {
    const [copied, setCopied] = useState(false);
    const [addrOpen, setAddrOpen] = useState(false);
    const [showXlm, setShowXlm] = useState(Number(balance.xlm) > 0.01);

    const usdcVal = Number(balance.usdc) || 0;
    const xlmVal = Number(balance.xlm) || 0;
    const usdDisplay = balance.usdPrimary ?? usdcVal.toFixed(2);
    const localDisplay = balance.fiatTotal ?? balance.zmwTotal ?? portfolioLocal;
    const xlmLocal = balance.xlmLocalEquiv ?? balance.xlmZmwEquiv ?? '0';
    const usdcLocal = balance.usdcLocalEquiv ?? balance.usdcZmwEquiv ?? '0';

    const copyAddr = async () => {
        if (!walletAddr || !navigator.clipboard) return;
        try {
            await navigator.clipboard.writeText(walletAddr);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* ignore */ }
    };

    return (
        <div className={dash.panelPadding}>
            {walletAddr && (
                <div className="mb-4 flex justify-start sm:justify-end">
                    <div className="relative w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setAddrOpen(!addrOpen)}
                            className="inline-flex min-h-[40px] w-full items-center justify-between gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 font-mono text-xs text-white/55 transition-all hover:border-[var(--brand-accent-border)] hover:bg-white/[0.06] sm:w-auto sm:justify-center"
                        >
                            <span className="truncate">{truncateAddress(walletAddr)}</span>
                            <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-white/40 transition-transform ${addrOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {addrOpen && (
                            <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-white/[0.1] bg-[#141414] p-3.5 shadow-[0_16px_48px_rgba(0,0,0,0.5)] sm:left-auto sm:right-0 sm:w-72">
                                <p className={dash.sectionLabel}>Stellar address (advanced)</p>
                                <code className="mt-2 block break-all font-mono text-xs leading-relaxed text-white/75">{walletAddr}</code>
                                <button
                                    type="button"
                                    onClick={copyAddr}
                                    className="mt-3 flex w-full min-h-[40px] items-center justify-center gap-2 rounded-lg bg-white/[0.06] text-xs font-semibold text-white/70 transition-colors hover:bg-white/[0.1]"
                                >
                                    {copied ? <Check className="h-3.5 w-3.5 text-[var(--brand-accent)]" /> : <Copy className="h-3.5 w-3.5" />}
                                    {copied ? 'Copied' : 'Copy address'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className={dash.balanceHero}>
                <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[var(--brand-accent)]" />
                    <p className={dash.statLabel}>Dollar wallet</p>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                    <p className={dash.statValue}>{formatNum(Number(usdDisplay))}</p>
                    <span className="text-sm font-medium text-white/35">USDC</span>
                </div>
                <p className="mt-1 text-sm text-white/45">
                    ≈ {formatNum(Number(localDisplay))} {localCurrency} total
                </p>
                {todayChange && todayChange.amount !== 0 ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                todayChange.amount >= 0
                                    ? 'bg-[var(--brand-accent-muted)] text-[var(--brand-accent)]'
                                    : 'bg-red-500/10 text-red-400'
                            }`}
                        >
                            {todayChange.amount >= 0 ? '+' : ''}{todayChange.percent.toFixed(1)}% today
                        </span>
                    </div>
                ) : null}
                <WalletBalanceChart />
            </div>

            <p className={`mt-5 mb-2.5 ${dash.sectionLabel}`}>Holdings</p>
            <div className="grid grid-cols-1 gap-2">
                <div className={`${dash.holdingRow} ring-1 ring-[var(--brand-accent-border)]`}>
                    <div className="flex items-center gap-2.5">
                        <AssetIcon asset="usdc" size="sm" />
                        <div>
                            <span className="text-sm font-semibold text-white">{assetDisplayLabel('usdc')}</span>
                            <p className="text-[0.625rem] text-[var(--brand-accent)]/80">Primary</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-white">{formatNum(usdcVal)}</p>
                        <p className="text-[0.625rem] text-white/40">{formatNum(Number(usdcLocal), 0)} {localCurrency}</p>
                    </div>
                </div>

                {(showXlm || xlmVal > 0.01) && (
                    <div className={dash.holdingRow}>
                        <div className="flex items-center gap-2.5">
                            <AssetIcon asset="xlm" size="sm" />
                            <span className="text-sm font-semibold text-white">{assetDisplayLabel('xlm')}</span>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold tabular-nums text-white">{formatNum(xlmVal, 4)}</p>
                            <p className="text-[0.625rem] text-white/40">{formatNum(Number(xlmLocal), 0)} {localCurrency}</p>
                        </div>
                    </div>
                )}

                {xlmVal <= 0.01 && !showXlm && (
                    <button
                        type="button"
                        onClick={() => setShowXlm(true)}
                        className="text-xs text-white/35 hover:text-white/55 text-left"
                    >
                        Show XLM balance
                    </button>
                )}
            </div>
        </div>
    );
}
