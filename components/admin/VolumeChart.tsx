'use client';

type DayPoint = { day: string; buyZmw: number; sellZmw: number; txCount?: number };

function dayLabel(day: string) {
    const s = String(day);
    if (s.length >= 10) return s.slice(5, 10);
    return s.slice(0, 5);
}

export function VolumeChart({ data, title }: { data: DayPoint[]; title: string }) {
    if (!data.length) {
        return (
            <div className="flex h-40 items-center justify-center text-sm text-slate-500">
                No volume data for this period
            </div>
        );
    }

    const max = Math.max(...data.map((d) => d.buyZmw + d.sellZmw), 1);

    return (
        <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
            <div className="flex h-40 items-end gap-1">
                {data.map((d) => {
                    const total = d.buyZmw + d.sellZmw;
                    const h = Math.max(4, (total / max) * 100);
                    const buyH = total > 0 ? (d.buyZmw / total) * h : 0;
                    const sellH = h - buyH;
                    return (
                        <div
                            key={String(d.day)}
                            className="group relative flex flex-1 flex-col justify-end"
                            title={`${d.day}: Buy ${d.buyZmw.toFixed(0)} · Sell ${d.sellZmw.toFixed(0)} ZMW`}
                        >
                            <div className="flex flex-col justify-end rounded-t bg-emerald-500" style={{ height: `${buyH}%` }} />
                            <div className="rounded-b bg-slate-400" style={{ height: `${sellH}%` }} />
                        </div>
                    );
                })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                <span>{dayLabel(String(data[0]?.day))}</span>
                <span>{dayLabel(String(data[data.length - 1]?.day))}</span>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded bg-emerald-500" /> Top-up
                </span>
                <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded bg-slate-400" /> Payout
                </span>
            </div>
        </div>
    );
}

/** Smooth area line chart for volume over time. */
export function VolumeAreaChart({
    data,
    rangeLabel = '7 Days',
}: {
    data: DayPoint[];
    rangeLabel?: string;
}) {
    if (!data.length) {
        return (
            <div className="flex h-56 items-center justify-center text-sm text-slate-500">
                No volume data for this period
            </div>
        );
    }

    const totals = data.map((d) => d.buyZmw + d.sellZmw);
    const max = Math.max(...totals, 1);
    const w = 640;
    const h = 220;
    const padX = 12;
    const padY = 16;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;

    const points = totals.map((v, i) => {
        const x = padX + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
        const y = padY + innerH - (v / max) * innerH;
        return { x, y, v, day: data[i].day };
    });

    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L ${points[points.length - 1].x.toFixed(1)} ${(h - padY).toFixed(1)} L ${points[0].x.toFixed(1)} ${(h - padY).toFixed(1)} Z`;

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
        y: padY + innerH * (1 - t),
        label: t === 0 ? '0' : formatCompact(max * t),
    }));

    return (
        <div>
            <div className="mb-5 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold tracking-tight text-slate-900">Volume over time</h3>
                <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-inset ring-slate-100">
                    {rangeLabel}
                </span>
            </div>
            <svg viewBox={`0 0 ${w} ${h}`} className="h-52 w-full" role="img" aria-label="Volume over time">
                {yTicks.map((t) => (
                    <g key={t.label}>
                        <line
                            x1={padX}
                            x2={w - padX}
                            y1={t.y}
                            y2={t.y}
                            stroke="#E8E6E1"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                        />
                        <text x={4} y={t.y + 3} fill="#A8A29E" fontSize="10">
                            {t.label}
                        </text>
                    </g>
                ))}
                <defs>
                    <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C9A962" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#C9A962" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={area} fill="url(#volFill)" />
                <path
                    d={line}
                    fill="none"
                    stroke="#C9A962"
                    strokeWidth="2.25"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                {points.map((p) => (
                    <circle key={String(p.day)} cx={p.x} cy={p.y} r="3" fill="#fff" stroke="#C9A962" strokeWidth="1.75">
                        <title>
                            {String(p.day)}: {formatCompact(p.v)}
                        </title>
                    </circle>
                ))}
            </svg>
            <div className="mt-1 flex justify-between px-1 text-[10px] text-slate-400">
                {data.filter((_, i) => i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)).map((d) => (
                    <span key={String(d.day)}>{dayLabel(String(d.day))}</span>
                ))}
            </div>
        </div>
    );
}

export type BreakdownSlice = { label: string; value: number; color: string };

export function TransactionDonut({
    slices,
    total,
}: {
    slices: BreakdownSlice[];
    total: number;
}) {
    const sum = slices.reduce((s, x) => s + x.value, 0) || 1;
    const r = 54;
    const c = 2 * Math.PI * r;
    let offset = 0;

    return (
        <div>
            <h3 className="mb-5 text-sm font-semibold tracking-tight text-slate-900">Transaction mix</h3>
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
                <div className="relative h-40 w-40 shrink-0">
                    <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
                        <circle cx="70" cy="70" r={r} fill="none" stroke="#F1F5F9" strokeWidth="18" />
                        {slices.map((slice) => {
                            const len = (slice.value / sum) * c;
                            const el = (
                                <circle
                                    key={slice.label}
                                    cx="70"
                                    cy="70"
                                    r={r}
                                    fill="none"
                                    stroke={slice.color}
                                    strokeWidth="18"
                                    strokeDasharray={`${len} ${c - len}`}
                                    strokeDashoffset={-offset}
                                    strokeLinecap="butt"
                                />
                            );
                            offset += len;
                            return el;
                        })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-2xl font-bold tabular-nums text-slate-900">{total.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">Total</p>
                    </div>
                </div>
                <ul className="w-full space-y-2.5">
                    {slices.map((s) => (
                        <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
                            <span className="flex items-center gap-2 text-slate-600">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                                {s.label}
                            </span>
                            <span className="font-semibold tabular-nums text-slate-800">{s.value.toLocaleString()}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export function KycGauge({
    verified,
    pending,
    rejected,
}: {
    verified: number;
    pending: number;
    rejected: number;
}) {
    const total = Math.max(verified + pending + rejected, 1);
    const pct = Math.round((verified / total) * 100);
    const c = Math.PI * 58;
    const filled = (pct / 100) * c;

    return (
        <div>
            <h3 className="mb-1 text-sm font-semibold tracking-tight text-slate-900">KYC</h3>
            <p className="mb-2 text-[11px] text-slate-400">Verification status</p>
            <div className="relative mx-auto mt-2 h-36 w-48">
                <svg viewBox="0 0 160 100" className="h-full w-full">
                    <path
                        d="M 22 90 A 58 58 0 0 1 138 90"
                        fill="none"
                        stroke="#E2E8F0"
                        strokeWidth="14"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 22 90 A 58 58 0 0 1 138 90"
                        fill="none"
                        stroke="#22C55E"
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={`${filled} ${c}`}
                    />
                </svg>
                <div className="absolute inset-x-0 bottom-2 text-center">
                    <p className="text-3xl font-bold tabular-nums text-slate-900">{pct}%</p>
                    <p className="text-xs font-medium text-slate-500">Verified</p>
                </div>
            </div>
            <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Verified
                    </span>
                    <span className="font-semibold tabular-nums">{verified.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Pending
                    </span>
                    <span className="font-semibold tabular-nums">{pending.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Rejected
                    </span>
                    <span className="font-semibold tabular-nums">{rejected.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}

export function SignupChart({ data }: { data: { day: string; count: number }[] }) {
    if (!data.length) return null;
    const max = Math.max(...data.map((d) => d.count), 1);
    return (
        <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">New signups</p>
            <div className="flex h-24 items-end gap-1">
                {data.map((d) => (
                    <div
                        key={String(d.day)}
                        className="flex-1 rounded-t bg-[var(--brand-accent)] opacity-80"
                        style={{ height: `${Math.max(8, (d.count / max) * 100)}%` }}
                        title={`${d.day}: ${d.count}`}
                    />
                ))}
            </div>
        </div>
    );
}

function formatCompact(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return String(Math.round(n));
}
