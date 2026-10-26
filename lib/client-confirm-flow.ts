'use client';

import { getUnlockedSecret, isWalletUnlocked } from '@/lib/client-wallet';
import { clientExecutePlan, type ClientTxPlan } from '@/lib/client-stellar';
import { beginClientSigning, endClientSigning, sleep } from '@/lib/client-signing-lock';

async function signPlanWithRetry(plan: ClientTxPlan, secret: string): Promise<string> {
    let lastError = 'Could not sign transaction.';
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            return await clientExecutePlan(plan, secret);
        } catch (err) {
            lastError = err instanceof Error ? err.message : lastError;
            const retryable =
                lastError.includes('Sequence conflict') || lastError.toLowerCase().includes('try again');
            if (!retryable || attempt >= 2) break;
            await sleep(2000 * (attempt + 1));
        }
    }
    throw new Error(lastError);
}

async function finalizeWithRetry(
    finalizeUrl: string,
    intentId: string,
    txHash: string
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
    let lastError = 'Could not finalize transaction.';
    for (let attempt = 0; attempt < 4; attempt++) {
        const fin = await fetch(finalizeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ intentId, txHash }),
        });
        const finData = (await fin.json().catch(() => ({}))) as Record<string, unknown>;
        if (fin.ok) {
            return { ok: true, data: finData };
        }
        lastError = String(finData.error ?? lastError);
        const lower = lastError.toLowerCase();
        const retryable =
            lower.includes('not found') ||
            lower.includes('verify') ||
            lower.includes('network') ||
            lower.includes('trustline') ||
            lower.includes('horizon') ||
            lower.includes('sequence');
        if (!retryable || attempt >= 3) break;
        await sleep(2000 * (attempt + 1));
    }
    return { ok: false, error: lastError };
}

export async function runSignedConfirmFlow(opts: {
    confirmUrl: string;
    finalizeUrl: string;
    intentId: string;
    confirmCode: string;
    onSigning?: () => void;
}): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
    const res = await fetch(opts.confirmUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentId: opts.intentId, confirmCode: opts.confirmCode }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
        return { ok: false, error: String(data.error ?? 'Confirmation failed.') };
    }

    if (data.requiresClientSign && data.plan) {
        if (!isWalletUnlocked()) {
            return { ok: false, error: 'Unlock your wallet to sign this transaction.' };
        }

        opts.onSigning?.();
        beginClientSigning();
        try {
            const secret = getUnlockedSecret();
            const txHash = await signPlanWithRetry(data.plan as ClientTxPlan, secret);
            return await finalizeWithRetry(opts.finalizeUrl, opts.intentId, txHash);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not sign transaction.';
            if (msg.includes('Unlock your wallet')) {
                return { ok: false, error: 'Unlock your wallet to sign this transaction.' };
            }
            return { ok: false, error: msg };
        } finally {
            endClientSigning();
        }
    }

    return { ok: true, data };
}
