import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { StellarService } from '@/lib/stellar';
import { parseStellarError } from '@/lib/stellar-error';
import { LencoService } from '@/lib/lenco';
import { sendPushNotification } from '@/lib/push';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET: Called by Vercel Cron to poll Lenco for pending deposits (fallback when webhook fails) */
export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET?.trim();
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: pendingTxs } = await supabase
            .from('transactions')
            .select('*')
            .eq('type', 'BUY')
            .eq('status', 'PENDING')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: true })
            .limit(20);

        if (!pendingTxs?.length) {
            return NextResponse.json({ checked: 0, completed: 0 });
        }

        const platformSecret = process.env.PLATFORM_WALLET_SECRET?.trim();
        if (!platformSecret) {
            console.error('Cron check-deposits: PLATFORM_WALLET_SECRET not configured');
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
        }

        let completed = 0;
        for (const tx of pendingTxs) {
            const reference = tx.reference?.trim();
            if (!reference) continue;

            let isPaid = false;
            const collection = await LencoService.getCollectionByReference(reference);
            if (collection && collection.status === 'successful') {
                isPaid = true;
            } else {
                const txByRef = await LencoService.getTransactionByReference(reference);
                if (txByRef && txByRef.status === 'successful' && txByRef.type === 'credit') {
                    isPaid = true;
                }
            }

            if (!isPaid) continue;

            const { data: user } = await supabase
                .from('users')
                .select('*')
                .eq('id', tx.user_id)
                .single();

            if (!user) {
                console.warn('Cron check-deposits: no user for tx', reference);
                continue;
            }

            const walletSecret = (user.wallet_secret ?? (user as { walletSecret?: string }).walletSecret) as string;
            const walletPublic = (user.wallet_public ?? (user as { walletPublic?: string }).walletPublic) as string;

            if (!walletSecret || !walletPublic) {
                console.error('Cron check-deposits: user missing wallet for', reference);
                await supabase.from('transactions').update({ status: 'FAILED' }).eq('id', tx.id);
                continue;
            }

            try {
                const asset = (tx.asset || 'xlm') as string;
                const amountStr = Number(tx.amount_xlm).toFixed(7);
                let txHash: string;

                if (asset === 'usdc') {
                    await StellarService.ensureUSDCTrustline(walletSecret);
                    txHash = await StellarService.sendUSDC(platformSecret, walletPublic, amountStr);
                } else {
                    txHash = await StellarService.sendXLM(platformSecret, walletPublic, amountStr);
                }

                await supabase
                    .from('transactions')
                    .update({ status: 'COMPLETED', tx_hash: txHash })
                    .eq('id', tx.id);
                console.log(`Cron check-deposits: completed ${reference}, txHash ${txHash}`);
                completed++;

                const pushToken = (user as { push_token?: string }).push_token;
                if (pushToken) {
                    const asset = (tx.asset || 'xlm') as string;
                    const amount = Number(tx.amount_xlm);
                    sendPushNotification(
                        pushToken,
                        'Deposit complete',
                        `${amount} ${asset.toUpperCase()} added to your wallet.`,
                        { type: 'deposit', amount, asset }
                    ).catch(() => {});
                }
            } catch (stellarError) {
                const errMsg = parseStellarError(stellarError);
                console.error('Cron check-deposits: Stellar failed for', reference, errMsg);
                await supabase.from('transactions').update({ status: 'FAILED' }).eq('id', tx.id);
            }
        }

        return NextResponse.json({ checked: pendingTxs.length, completed });
    } catch (error) {
        console.error('Cron check-deposits error:', error);
        return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
    }
}
