import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { StellarService } from '@/lib/stellar';
import { PLATFORM_WALLET_PUBLIC } from '@/lib/constants';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { amount, memo, asset = 'xlm' } = body;

        const userId = await getUserIdFromRequest(request);

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

        const amountStr = String(amount ?? 0);
        const txHash = asset === 'usdc'
            ? await StellarService.sendUSDC(user.wallet_secret, PLATFORM_WALLET_PUBLIC, amountStr, memo)
            : await StellarService.sendXLM(user.wallet_secret, PLATFORM_WALLET_PUBLIC, amountStr, memo);

        return NextResponse.json({ success: true, txHash, message: 'Deposit simulated successfully' });

    } catch (error: any) {
        console.error('Simulate Deposit Error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to simulate deposit' }, { status: 500 });
    }
}
