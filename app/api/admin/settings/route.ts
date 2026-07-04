import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { invalidateRatesCache } from '@/lib/rates';

async function isAdmin(request: Request): Promise<boolean> {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return false;
    const rows = await sql`
        SELECT role FROM users WHERE id = ${userId} LIMIT 1
    `;
    return (rows[0] as { role?: string } | undefined)?.role === 'admin';
}

/** GET - fetch current settings */
export async function GET(request: Request) {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const rows = await sql`
            SELECT key, value_json FROM platform_settings WHERE key IN ('rates', 'fee', 'limits')
        `;
        const obj: Record<string, unknown> = {};
        for (const row of rows as unknown as { key: string; value_json: string }[]) {
            try {
                obj[row.key] = JSON.parse(row.value_json);
            } catch {
                obj[row.key] = {};
            }
        }
        return NextResponse.json({
            rates: obj.rates ?? { xlm_buy: 3.5, xlm_sell: 3.5, usdc_buy: 25, usdc_sell: 25 },
            fee: obj.fee ?? { buy_percent: 0, sell_percent: 0 },
            limits: {
                min_deposit_zmw: (obj.limits as Record<string, number>)?.min_deposit_zmw ?? 4,
                max_deposit_zmw: (obj.limits as Record<string, number>)?.max_deposit_zmw ?? 50000,
                min_withdraw_zmw: (obj.limits as Record<string, number>)?.min_withdraw_zmw ?? 4,
                max_withdraw_zmw: (obj.limits as Record<string, number>)?.max_withdraw_zmw ?? 50000,
            },
        });
    } catch (err) {
        console.error('Admin settings GET:', err);
        return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
    }
}

/** PATCH - update rates and/or fees */
export async function PATCH(request: Request) {
    if (!(await isAdmin(request))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json().catch(() => ({}));
        const { rates, fee, limits } = body;

        if (rates && typeof rates === 'object') {
            const merged = {
                xlm_buy: Number(rates.xlm_buy) || 3.5,
                xlm_sell: Number(rates.xlm_sell) || 3.5,
                usdc_buy: Number(rates.usdc_buy) || 25,
                usdc_sell: Number(rates.usdc_sell) || 25,
            };
            await sql`
                INSERT INTO platform_settings (key, value_json, updated_at)
                VALUES ('rates', ${JSON.stringify(merged)}, NOW())
                ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = NOW()
            `;
        }

        if (fee && typeof fee === 'object') {
            const merged = {
                buy_percent: Math.max(0, Math.min(100, Number(fee.buy_percent) || 0)),
                sell_percent: Math.max(0, Math.min(100, Number(fee.sell_percent) || 0)),
            };
            await sql`
                INSERT INTO platform_settings (key, value_json, updated_at)
                VALUES ('fee', ${JSON.stringify(merged)}, NOW())
                ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = NOW()
            `;
        }

        if (limits && typeof limits === 'object') {
            const minDep = Math.max(1, Number(limits.min_deposit_zmw) || 4);
            const maxDep = Math.max(minDep, Number(limits.max_deposit_zmw) || 50000);
            const minWith = Math.max(1, Number(limits.min_withdraw_zmw) || 4);
            const maxWith = Math.max(minWith, Number(limits.max_withdraw_zmw) || 50000);
            const merged = {
                min_deposit_zmw: minDep,
                max_deposit_zmw: maxDep,
                min_withdraw_zmw: minWith,
                max_withdraw_zmw: maxWith,
            };
            await sql`
                INSERT INTO platform_settings (key, value_json, updated_at)
                VALUES ('limits', ${JSON.stringify(merged)}, NOW())
                ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = NOW()
            `;
        }

        invalidateRatesCache();
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Admin settings PATCH:', err);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
