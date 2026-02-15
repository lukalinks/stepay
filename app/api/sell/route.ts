import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { StellarService } from '@/lib/stellar';
import { LencoService } from '@/lib/lenco';
import { parseStellarError } from '@/lib/stellar-error';
import { cookies } from 'next/headers';
import { PLATFORM_WALLET_PUBLIC } from '@/lib/constants';
import { getRates, getFees, getLimits, cryptoToZmw } from '@/lib/rates';

export async function GET() {
    return NextResponse.json({ message: 'Use POST to cash out. See docs for payload.' });
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { amount, asset = 'xlm', phone: reqPhone, operator: reqOperator } = body || {};

        const cookieStore = await cookies();
        const userId = cookieStore.get('stepay_user')?.value;

        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const amountNum = Number(amount);
        const assetLabel = asset === 'usdc' ? 'USDC' : 'XLM';

        if (amount === undefined || amount === null || amount === '') {
            return NextResponse.json({ success: false, error: 'Please enter an amount to sell' }, { status: 400 });
        }
        if (isNaN(amountNum) || amountNum <= 0) {
            return NextResponse.json({ success: false, error: 'Please enter a valid amount to sell' }, { status: 400 });
        }

        const phoneRaw = typeof reqPhone === 'string' ? reqPhone.trim() : '';
        const phoneDigits = phoneRaw.replace(/\s+/g, '').replace(/^0/, '').replace(/\D/g, '');
        const phoneForPayout = phoneDigits.length >= 10 ? phoneRaw : (user.phone_number?.trim() || '');
        const phoneDigitsFinal = phoneForPayout.replace(/\s+/g, '').replace(/^0/, '').replace(/\D/g, '');
        if (phoneDigitsFinal.length < 10) {
            return NextResponse.json({ success: false, error: 'Please enter a valid mobile number to receive the cash' }, { status: 400 });
        }
        const operator = ['mtn', 'airtel', 'zamtel'].includes(reqOperator) ? reqOperator : (user.preferred_operator || 'mtn') as 'mtn' | 'airtel' | 'zamtel';

        const walletSecret = user.wallet_secret ?? (user as { walletSecret?: string }).walletSecret;
        const walletPublic = user.wallet_public ?? (user as { walletPublic?: string }).walletPublic;
        if (!walletSecret || !walletPublic) {
            return NextResponse.json({ success: false, error: 'Wallet not found. Please contact support.' }, { status: 400 });
        }

        const balance = asset === 'usdc'
            ? await StellarService.getUSDCBalance(walletPublic)
            : await StellarService.getBalance(walletPublic);
        const balanceNum = Number(balance);

        if (balanceNum < amountNum) {
            return NextResponse.json(
                { success: false, error: `Insufficient ${assetLabel} balance. You have ${balance} ${assetLabel}.` },
                { status: 400 }
            );
        }
        // XLM: user must keep ~0.01 for network fees; cannot send entire balance
        if (asset === 'xlm' && balanceNum - amountNum < 0.01) {
            return NextResponse.json(
                { success: false, error: 'Keep at least 0.01 XLM for network fees. Reduce the amount to cash out.' },
                { status: 400 }
            );
        }

        const [rates, fees, limits] = await Promise.all([getRates(), getFees(), getLimits()]);
        const amountFiat = cryptoToZmw(amountNum, asset, rates, fees);
        if (amountFiat < limits.min_withdraw_zmw) {
            return NextResponse.json({
                success: false,
                error: `Minimum ${limits.min_withdraw_zmw} ZMW payout per withdrawal.`,
            }, { status: 400 });
        }
        if (amountFiat > limits.max_withdraw_zmw) {
            return NextResponse.json({
                success: false,
                error: `Maximum ${limits.max_withdraw_zmw} ZMW per withdrawal.`,
            }, { status: 400 });
        }
        const depositMemo = Math.floor(100000 + Math.random() * 900000).toString();
        const reference = `SELL-${Date.now()}`;

        // Create pending transaction record
        const { data: txRecord, error: insertError } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                type: 'SELL',
                amount_fiat: amountFiat,
                amount_xlm: amountNum,
                status: 'PENDING',
                reference,
                deposit_memo: depositMemo,
                asset: asset,
            })
            .select('id')
            .single();

        if (insertError || !txRecord) {
            console.error('Sell: Failed to create transaction', insertError);
            return NextResponse.json({ success: false, error: 'Failed to create sell order' }, { status: 500 });
        }

        // Transfer from user's wallet to platform (deduct from their balance)
        let txHash: string;
        try {
            const amountStr = amountNum.toFixed(7);
            if (asset === 'usdc') {
                txHash = await StellarService.sendUSDC(walletSecret, PLATFORM_WALLET_PUBLIC, amountStr, depositMemo);
            } else {
                txHash = await StellarService.sendXLM(walletSecret, PLATFORM_WALLET_PUBLIC, amountStr, depositMemo);
            }
        } catch (stellarErr: unknown) {
            const errMsg = parseStellarError(stellarErr);
            console.error('Sell: Stellar transfer failed', stellarErr);
            await supabase.from('transactions').update({ status: 'FAILED' }).eq('id', txRecord.id);
            return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
        }

        // Initiate Lenco payout to requested phone
        const phone = phoneForPayout;

        const payoutEnabled = process.env.LENCO_PAYOUT_ENABLED !== 'false';
        if (payoutEnabled && amountFiat >= 1) {
            try {
                await LencoService.createPayout({
                    amount: amountFiat,
                    phone,
                    operator,
                    reference,
                });
            } catch (payoutErr: unknown) {
                const errMsg = payoutErr instanceof Error ? payoutErr.message : 'Payout failed';
                console.error('Sell: Lenco payout failed', payoutErr);
                await supabase.from('transactions').update({ status: 'COMPLETED', tx_hash: txHash }).eq('id', txRecord.id);
                return NextResponse.json({
                    success: true,
                    message: `${amountNum} ${assetLabel} sold. ZMW ${amountFiat.toFixed(2)} payout failed: ${errMsg}. Contact support with ref: ${reference}.`,
                    amountFiat,
                    txHash,
                });
            }
        } else if (!payoutEnabled) {
            console.warn('Sell: Lenco payout skipped (LENCO_PAYOUT_ENABLED=false)');
        }

        await supabase
            .from('transactions')
            .update({ status: 'COMPLETED', tx_hash: txHash })
            .eq('id', txRecord.id);

        return NextResponse.json({
            success: true,
            message: payoutEnabled
                ? `Sold ${amountNum} ${assetLabel}! ZMW ${amountFiat.toFixed(2)} is being sent to ${phone}. Funds typically arrive within a few minutes.`
                : `Sold ${amountNum} ${assetLabel}! ZMW ${amountFiat.toFixed(2)} owed. Contact support with ref: ${reference}.`,
            amountFiat,
            txHash,
        });
    } catch (error) {
        console.error('Sell API Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to sell' }, { status: 500 });
    }
}
