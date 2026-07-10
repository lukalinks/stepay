import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { StellarService } from '@/lib/stellar';
import { getUserWalletSecret } from '@/lib/signer';
import { tryCompleteUserPendingDeposits } from '@/lib/complete-buy-deposit';
import { sendPushNotification } from '@/lib/push';
import { sql } from '@/lib/db';

/** Retry USDC deposits after client establishes trustline, and confirm any paid pending buys. */
export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRows = await sql`SELECT wallet_public, push_token FROM users WHERE id = ${userId} LIMIT 1`;
        const user = userRows[0] as { wallet_public: string; push_token?: string | null } | undefined;
        if (!user?.wallet_public) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
        }

        try {
            const walletSecret = await getUserWalletSecret(userId);
            await StellarService.ensureUSDCTrustline(walletSecret);
        } catch {
            // self-custody users establish trustline in the browser on unlock
        }

        const results = await tryCompleteUserPendingDeposits(userId);
        const completed = results.filter((r) => r.status === 'completed').length;

        if (completed > 0 && user.push_token) {
            sendPushNotification(
                user.push_token,
                'Deposit complete',
                `${completed} deposit${completed > 1 ? 's' : ''} credited to your wallet.`,
                { type: 'deposit' }
            ).catch(() => {});
        }

        return NextResponse.json({ ok: true, completed, results });
    } catch (err) {
        console.error('retry-pending deposit error:', err);
        return NextResponse.json({ error: 'Could not retry deposits' }, { status: 500 });
    }
}
