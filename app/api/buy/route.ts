import { NextResponse } from 'next/server';
import { LencoService } from '@/lib/lenco';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { XLM_RATE_ZMW, USDC_RATE_ZMW } from '@/lib/constants';

const schema = z.object({
    amount: z.coerce.number().min(1),
    phone: z.string().min(10),
    operator: z.enum(['mtn', 'airtel', 'zamtel']).default('mtn'),
    asset: z.enum(['xlm', 'usdc']).default('xlm'),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { amount, phone, operator, asset } = schema.parse(body);

        const cookieStore = await cookies();
        const userId = cookieStore.get('stepay_user')?.value;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const rate = asset === 'usdc' ? USDC_RATE_ZMW : XLM_RATE_ZMW;
        const amountCrypto = amount / rate;
        const minZmw = asset === 'xlm' ? 4 : 25; // XLM: 1 XLM reserve; USDC: ~1 USDC min
        if (amount < minZmw) {
            return NextResponse.json({
                success: false,
                error: `Minimum ${minZmw} ZMW required for ${asset.toUpperCase()}.`,
            }, { status: 400 });
        }

        const reference = `REF-${Date.now()}`;

        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                type: 'BUY',
                amount_fiat: amount,
                amount_xlm: amountCrypto,
                status: 'PENDING',
                reference,
                asset: asset,
            })
            .select()
            .single();

        if (txError) throw txError;

        try {
            await LencoService.createCollection({
                amount,
                phone,
                operator: operator ?? 'mtn',
                reference,
            });
            await supabase.from('users').update({ preferred_operator: operator ?? 'mtn' }).eq('id', userId);
        } catch (lencoError: any) {
            const msg = lencoError?.message || 'Mobile money collection failed';
            return NextResponse.json({ success: false, error: msg }, { status: 400 });
        }

        // Lenco returns immediately with "pay-offline" - the user must approve on their phone.
        // XLM is sent only when Lenco webhook confirms payment (see /api/hooks/lenco).
        return NextResponse.json({
            success: true,
            reference,
            message: `Payment request sent! Check your phone to approve. ${asset.toUpperCase()} will be sent once payment is confirmed.`,
        });
    } catch (error: any) {
        console.error('Buy API Error:', error);
        const message = error?.message || 'Failed to process buy request';
        const status = error?.name === 'ZodError' ? 400 : 500;
        return NextResponse.json({ success: false, error: message }, { status });
    }
}
