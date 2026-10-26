import { SEP_USDC_ISSUER } from '@/lib/sep-config';

export type Sep7PayOpts = {
    destination: string;
    amount?: number | string | null;
    asset?: 'xlm' | 'usdc' | string;
    memo?: string | null;
    msg?: string | null;
    /** HTTPS callback / origin for wallets that support it */
    callback?: string | null;
};

/**
 * Build a SEP-0007 payment request URI (web+stellar:pay?...).
 * Stellar wallets can open this to prefill a payment to a Stepay user.
 */
export function buildSep7PayUri(opts: Sep7PayOpts): string {
    const destination = opts.destination.trim();
    if (!destination.startsWith('G') || destination.length < 56) {
        throw new Error('Invalid Stellar destination for SEP-7');
    }

    const params = new URLSearchParams();
    params.set('destination', destination);

    const asset = (opts.asset || 'usdc').toLowerCase();
    if (asset === 'usdc') {
        params.set('asset_code', 'USDC');
        params.set('asset_issuer', SEP_USDC_ISSUER);
    }
    // native XLM: omit asset_code / asset_issuer

    if (opts.amount != null && opts.amount !== '') {
        const n = Number(opts.amount);
        if (Number.isFinite(n) && n > 0) {
            params.set('amount', asset === 'usdc' ? n.toFixed(2) : String(n));
        }
    }

    if (opts.memo?.trim()) {
        params.set('memo', opts.memo.trim().slice(0, 28));
        params.set('memo_type', 'MEMO_TEXT');
    }

    if (opts.msg?.trim()) {
        params.set('msg', opts.msg.trim().slice(0, 120));
    }

    if (opts.callback?.trim()) {
        params.set('callback', opts.callback.trim());
    }

    return `web+stellar:pay?${params.toString()}`;
}
