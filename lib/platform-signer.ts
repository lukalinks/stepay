import { auditSign, clientIp } from '@/lib/signer';

export function getPlatformWalletSecret(): string {
    const secret = process.env.PLATFORM_WALLET_SECRET?.trim();
    if (!secret) {
        throw new Error('Platform wallet is not configured');
    }
    return secret;
}

export async function auditPlatformSign(opts: {
    userId?: string | null;
    reason: 'deposit' | 'swap_payout' | 'simulate';
    txHash: string;
    request?: Request;
}): Promise<void> {
    if (!opts.userId) return;
    await auditSign({
        userId: opts.userId,
        reason: 'trustline',
        intentId: null,
        txHash: opts.txHash,
        ip: opts.request ? clientIp(opts.request) : null,
    });
}
