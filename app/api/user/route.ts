import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { StellarService } from '@/lib/stellar';
import { XLM_RATE_ZMW, USDC_RATE_ZMW } from '@/lib/constants';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('stepay_user')?.value;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { data: transactions } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        const [xlmBalance, usdcBalance] = await Promise.all([
            StellarService.getBalance(user.wallet_public),
            StellarService.getUSDCBalance(user.wallet_public),
        ]);

        const transactionsForFrontend = (transactions ?? []).map((tx) => ({
            id: tx.id,
            type: tx.type,
            asset: tx.asset || 'xlm',
            amountFiat: tx.amount_fiat,
            amountXLM: tx.amount_xlm,
            status: tx.status,
            reference: tx.reference,
            txHash: tx.tx_hash,
            createdAt: tx.created_at,
            depositMemo: tx.deposit_memo,
        }));

        return NextResponse.json({
            user: {
                phone: user.phone_number,
                walletPublic: user.wallet_public,
            },
            balance: {
                xlm: xlmBalance,
                usdc: usdcBalance,
                xlmZmwEquiv: (Number(xlmBalance) * XLM_RATE_ZMW).toFixed(2),
                usdcZmwEquiv: (Number(usdcBalance) * USDC_RATE_ZMW).toFixed(2),
            },
            transactions: transactionsForFrontend,
        });

    } catch (error) {
        console.error('User API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }
}
