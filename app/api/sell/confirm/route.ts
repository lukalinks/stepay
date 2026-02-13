import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { StellarService } from '@/lib/stellar';
import { LencoService } from '@/lib/lenco';
import { PLATFORM_WALLET_PUBLIC } from '@/lib/constants';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { memo } = body;

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

        const tx = await StellarService.checkMemoTransaction(PLATFORM_WALLET_PUBLIC, memo);

        if (!tx) {
            return NextResponse.json({
                success: false,
                message: 'Deposit not found yet. Please wait a few seconds and try again.',
            });
        }

        const txHash = (tx as { hash?: string }).hash ?? (tx as { id?: string }).id ?? '';

        const { data: pendingTx } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .eq('type', 'SELL')
            .eq('status', 'PENDING')
            .eq('deposit_memo', memo)
            .single();

        if (pendingTx) {
            // Validate user has phone number for payout
            const phone = user.phone_number?.trim();
            if (!phone || phone.length < 10) {
                return NextResponse.json({
                    success: false,
                    message: 'No valid phone number on file for payout. Please contact support.',
                }, { status: 400 });
            }

            const operator = (user.preferred_operator || 'mtn') as 'mtn' | 'airtel' | 'zamtel';
            const payoutAmount = Number(pendingTx.amount_fiat);
            if (isNaN(payoutAmount) || payoutAmount < 1) {
                return NextResponse.json({
                    success: false,
                    message: 'Invalid payout amount. Please contact support.',
                }, { status: 400 });
            }

            // Initiate payout FIRST - only mark COMPLETED after Lenco accepts it
            const payoutEnabled = process.env.LENCO_PAYOUT_ENABLED !== 'false';
            if (payoutEnabled) {
                try {
                    await LencoService.createPayout({
                        amount: pendingTx.amount_fiat,
                        phone,
                        operator,
                        reference: pendingTx.reference,
                    });
                } catch (payoutErr: unknown) {
                    const errMsg = payoutErr instanceof Error ? payoutErr.message : 'Payout failed';
                    console.error('Sell payout failed:', payoutErr);
                    return NextResponse.json({
                        success: false,
                        message: `Payout could not be initiated: ${errMsg}. Your crypto was received. Please contact support with reference ${pendingTx.reference}.`,
                    }, { status: 502 });
                }
            } else {
                console.warn('Lenco payout skipped (LENCO_PAYOUT_ENABLED=false). Manual payout required.');
            }

            // Payout initiated successfully - now mark transaction complete
            await supabase
                .from('transactions')
                .update({ status: 'COMPLETED', tx_hash: txHash })
                .eq('id', pendingTx.id);

            const payoutNote = payoutEnabled
                ? `ZMW ${pendingTx.amount_fiat} is being sent to ${phone}. Funds typically arrive within a few minutes.`
                : `ZMW ${pendingTx.amount_fiat} owed. Contact support with reference ${pendingTx.reference} for manual payout.`;
            return NextResponse.json({
                success: true,
                message: `Deposit confirmed! ${payoutNote}`,
            });
        }

        return NextResponse.json({
            success: false,
            message: 'Deposit found on blockchain but no matching sell order. Please ensure you created the sell order first, then sent with the exact memo. Contact support with your memo if you need assistance.',
        }, { status: 404 });

    } catch (error) {
        console.error('Sell Confirm API Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to verify deposit' }, { status: 500 });
    }
}
