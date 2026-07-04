import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { StellarService } from '@/lib/stellar';
import { getUserIdFromRequest } from '@/lib/auth';
import { getUserWalletSecret } from '@/lib/signer';
import { getPlatformWalletSecret } from '@/lib/platform-signer';

export async function POST(request: Request) {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Simulate deposit is only available in development' }, { status: 403 });
    }
    try {
        const body = await request.json();
        const { amount, memo, asset = 'xlm' } = body;

        const userId = await getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRows = await sql`
            SELECT wallet_public FROM users WHERE id = ${userId} LIMIT 1
        `;
        const user = userRows[0] as { wallet_public: string } | undefined;

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const amountStr = String(amount ?? 0);
        const platformSecret = getPlatformWalletSecret();

        const walletSecret = await getUserWalletSecret(userId);
        if (asset === 'usdc') {
            await StellarService.ensureUSDCTrustline(walletSecret);
        }

        const txHash =
            asset === 'usdc'
                ? await StellarService.sendUSDC(platformSecret, user.wallet_public, amountStr, memo)
                : await StellarService.sendXLM(platformSecret, user.wallet_public, amountStr, memo);

        return NextResponse.json({ success: true, txHash, message: 'Deposit simulated successfully' });
    } catch (error: unknown) {
        const err = error as { message?: string };
        console.error('Simulate Deposit Error:', error);
        return NextResponse.json(
            { success: false, error: err.message || 'Failed to simulate deposit' },
            { status: 500 }
        );
    }
}
