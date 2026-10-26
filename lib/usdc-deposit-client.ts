'use client';

import { sleep } from '@/lib/client-signing-lock';

type UsdcReadyResponse = {
    ready?: boolean;
    error?: string;
    code?: string;
    needsUnlock?: boolean;
    activationRequired?: boolean;
    deferredActivation?: boolean;
    hasAccount?: boolean;
};

export type UsdcPrepResult =
    | { ok: true; deferredActivation?: boolean; needsUnlock?: boolean }
    | { ok: false; error: string; code?: string; needsUnlock?: boolean };

function isDeferred(data: UsdcReadyResponse): boolean {
    return Boolean(data.activationRequired || data.deferredActivation || data.code === 'activation_required');
}

function isUnlockOnly(data: UsdcReadyResponse): boolean {
    return data.code === 'usdc_trustline_required' || Boolean(data.needsUnlock);
}

/**
 * Prepare USDC receive path.
 * Never blocks a deposit solely because the trustline is not set yet —
 * mobile money can proceed; credit waits until unlock/trustline after payment.
 */
export async function prepareUsdcWallet(opts: {
    ensureUsdcReady: () => Promise<boolean | void>;
    walletReady: boolean;
    allowDeferredActivation?: boolean;
}): Promise<UsdcPrepResult> {
    const statusRes = await fetch('/api/deposit/usdc-ready', { credentials: 'include' });
    const status = (await statusRes.json().catch(() => ({}))) as UsdcReadyResponse;

    if (statusRes.ok && status.ready) {
        return { ok: true };
    }

    if (opts.allowDeferredActivation !== false && isDeferred(status)) {
        return { ok: true, deferredActivation: true };
    }

    if (status.hasAccount === false || isDeferred(status)) {
        return { ok: true, deferredActivation: true };
    }

    // Self-custody trustline not ready yet — deposit may still start.
    if (isUnlockOnly(status)) {
        if (opts.walletReady) {
            try {
                await opts.ensureUsdcReady();
            } catch {
                // optional best-effort
            }
            const again = await fetch('/api/deposit/usdc-ready', { credentials: 'include' });
            const againData = (await again.json().catch(() => ({}))) as UsdcReadyResponse;
            if (again.ok && againData.ready) return { ok: true };
        }
        return { ok: true, needsUnlock: !opts.walletReady };
    }

    const post = await fetch('/api/deposit/usdc-ready', { method: 'POST', credentials: 'include' });
    const postData = (await post.json().catch(() => ({}))) as UsdcReadyResponse;

    if (post.ok && postData.ready) {
        return { ok: true };
    }
    if (isDeferred(postData) || isUnlockOnly(postData)) {
        if (opts.walletReady && !isDeferred(postData)) {
            try {
                await opts.ensureUsdcReady();
            } catch {
                // optional
            }
            for (let attempt = 0; attempt < 3; attempt++) {
                const res = await fetch('/api/deposit/usdc-ready', { credentials: 'include' });
                const data = (await res.json().catch(() => ({}))) as UsdcReadyResponse;
                if (res.ok && data.ready) return { ok: true };
                if (isDeferred(data) || isUnlockOnly(data)) {
                    await sleep(1200);
                    continue;
                }
                break;
            }
        }
        return {
            ok: true,
            deferredActivation: isDeferred(postData),
            needsUnlock: isUnlockOnly(postData) && !opts.walletReady,
        };
    }

    // Hard failure (e.g. hosted trustline_failed) — still allow deposit when activation covers it.
    if (postData.code === 'trustline_failed' || postData.code === 'trustline_pending') {
        return { ok: true, needsUnlock: Boolean(postData.needsUnlock) };
    }

    if (!post.ok && postData.error) {
        return {
            ok: false,
            error: postData.error,
            code: postData.code,
            needsUnlock: Boolean(postData.needsUnlock),
        };
    }

    return { ok: true, needsUnlock: Boolean(postData.needsUnlock) && !opts.walletReady };
}

/** @deprecated Use prepareUsdcWallet */
export const prepareUsdcForDeposit = prepareUsdcWallet;
