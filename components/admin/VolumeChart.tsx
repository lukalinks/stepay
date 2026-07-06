'use client';

type DayPoint = { day: string; buyZmw: number; sellZmw: number };

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
                <span>{String(data[0]?.day).slice(5)}</span>
                <span>{String(data[data.length - 1]?.day).slice(5)}</span>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded bg-emerald-500" /> Buy
                </span>
                <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded bg-slate-400" /> Sell
                </span>
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
