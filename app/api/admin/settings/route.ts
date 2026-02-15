import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { invalidateRatesCache } from '@/lib/rates';

/** Check if user is admin - TODO: replace with proper admin auth */
async function isAdmin(): Promise<boolean> {
    const cookieStore = await cookies();
    const userId = cookieStore.get('stepay_user')?.value;
    if (!userId) return false;
    const { data } = await supabase.from('users').select('role').eq('id', userId).single();
    return data?.role === 'admin';
}

/** GET - fetch current settings */
export async function GET() {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { data } = await supabase
            .from('platform_settings')
            .select('key, value_json')
            .in('key', ['rates', 'fee', 'limits']);
        const obj: Record<string, unknown> = {};
        for (const row of data ?? []) {
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
    if (!(await isAdmin())) {
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
            await supabase
                .from('platform_settings')
                .upsert({ key: 'rates', value_json: JSON.stringify(merged), updated_at: new Date().toISOString() }, { onConflict: 'key' });
        }

        if (fee && typeof fee === 'object') {
            const merged = {
                buy_percent: Math.max(0, Math.min(100, Number(fee.buy_percent) || 0)),
                sell_percent: Math.max(0, Math.min(100, Number(fee.sell_percent) || 0)),
            };
            await supabase
                .from('platform_settings')
                .upsert({ key: 'fee', value_json: JSON.stringify(merged), updated_at: new Date().toISOString() }, { onConflict: 'key' });
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
            await supabase
                .from('platform_settings')
                .upsert({ key: 'limits', value_json: JSON.stringify(merged), updated_at: new Date().toISOString() }, { onConflict: 'key' });
        }

        invalidateRatesCache();
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Admin settings PATCH:', err);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
