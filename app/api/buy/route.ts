import { NextResponse } from 'next/server';
import { LencoService } from '@/lib/lenco';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getRates, getFees, zmwToCrypto } from '@/lib/rates';

const schema = z.object({
    amount: z.coerce.number().min(1),
    phone: z.string().min(10),
    operator: z.enum(['mtn', 'airtel', 'zamtel']).default('mtn'),
    asset: z.enum(['xlm', 'usdc']).default('xlm'),
});

export async function GET() {
    return NextResponse.json({ message: 'Use POST to create a deposit. See docs for payload.' });
}

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

        const [rates, fees] = await Promise.all([getRates(), getFees()]);
        const amountCrypto = zmwToCrypto(amount, asset, rates, fees);
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
            const normalizedPhone = phone.replace(/\s+/g, '').replace(/^0/, '');
            const phoneForDb = normalizedPhone.startsWith('+260') ? normalizedPhone : normalizedPhone.startsWith('260') ? `+${normalizedPhone}` : `+260${normalizedPhone}`;
            await supabase.from('users').update({
                preferred_operator: operator ?? 'mtn',
                phone_number: phoneForDb,
            }).eq('id', userId);
        } catch (lencoError: any) {
            const msg = lencoError?.message || 'Mobile money collection failed';
            await supabase.from('transactions').delete().eq('id', transaction.id);
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
        let message = error?.message || 'Failed to process buy request';
        if (error?.name === 'ZodError' && Array.isArray(error?.issues) && error.issues[0]) {
            const first = error.issues[0];
            const path = first?.path?.[0];
            if (path === 'amount') message = 'Please enter a valid amount (minimum 1 ZMW)';
            else if (path === 'phone') message = 'Please enter a valid Zambian mobile number (at least 10 digits)';
            else if (path === 'operator') message = 'Please select MTN, Airtel, or Zamtel';
        }
        const status = error?.name === 'ZodError' ? 400 : 500;
        return NextResponse.json({ success: false, error: message }, { status });
    }
}
