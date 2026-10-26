/**
 * Client for the platform-signer service.
 * The Next.js app never loads PLATFORM_WALLET_SECRET when PLATFORM_SIGNER_URL is set.
 */
import { auditSign, clientIp } from '@/lib/signer';

type SendAsset = 'xlm' | 'usdc';

function signerUrl(): string {
    const url = process.env.PLATFORM_SIGNER_URL?.trim();
    if (!url) {
        throw new Error('PLATFORM_SIGNER_URL is not configured');
    }
    return url.replace(/\/$/, '');
}

function signerToken(): string {
    const token = process.env.PLATFORM_SIGNER_TOKEN?.trim();
    if (!token) {
        throw new Error('PLATFORM_SIGNER_TOKEN is not configured');
    }
    return token;
}

async function signerFetch<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${signerUrl()}${path}`, {
        method: body ? 'POST' : 'GET',
        headers: {
            Authorization: `Bearer ${signerToken()}`,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
        throw new Error(data.error || `Platform signer error (${res.status})`);
    }
    return data;
}

export async function probePlatformSigner(): Promise<{ ok: boolean; publicKey?: string; detail?: string }> {
    try {
        if (!process.env.PLATFORM_SIGNER_URL?.trim()) {
            return { ok: false, detail: 'PLATFORM_SIGNER_URL missing' };
        }
        const res = await fetch(`${signerUrl()}/health`, { cache: 'no-store' });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; publicKey?: string };
        if (!res.ok || !data.ok) {
            return { ok: false, detail: `HTTP ${res.status}` };
        }
        return { ok: true, publicKey: data.publicKey };
    } catch (err) {
        return { ok: false, detail: err instanceof Error ? err.message : 'unreachable' };
    }
}

/** Send XLM or USDC from the platform wallet via the isolated signer. */
export async function platformSendPayment(opts: {
    asset: SendAsset;
    destination: string;
    amount: string | number;
    memo?: string;
    reason: string;
}): Promise<string> {
    const data = await signerFetch<{ hash: string }>('/v1/send', {
        asset: opts.asset,
        destination: opts.destination,
        amount: String(opts.amount),
        memo: opts.memo,
        reason: opts.reason,
    });
    if (!data.hash) throw new Error('Platform signer returned no hash');
    return data.hash;
}

export async function platformSendXlm(
    destination: string,
    amount: string | number,
    memo?: string,
    reason = 'xlm_payment'
): Promise<string> {
    return platformSendPayment({ asset: 'xlm', destination, amount, memo, reason });
}

export async function platformSendUsdc(
    destination: string,
    amount: string | number,
    memo?: string,
    reason = 'usdc_payment'
): Promise<string> {
    return platformSendPayment({ asset: 'usdc', destination, amount, memo, reason });
}

/** Ensure destination has enough XLM for a USDC trustline (create or top-up). */
export async function platformEnsureXlmForUsdcTrustline(destination: string): Promise<void> {
    await signerFetch('/v1/ensure-xlm-for-usdc', { destination });
}

/**
 * Local hot-wallet secret for in-process signing.
 * Prefer PLATFORM_SIGNER_URL + platformSend* when the isolated signer is deployed.
 */
export function getPlatformWalletSecret(): string {
    const secret = process.env.PLATFORM_WALLET_SECRET?.trim();
    if (!secret) {
        throw new Error('Platform wallet is not configured (PLATFORM_WALLET_SECRET)');
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
