'use client';

import { getUnlockedSecret } from '@/lib/client-wallet';
import { clientExecutePlan, type ClientTxPlan } from '@/lib/client-stellar';

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
        opts.onSigning?.();
        try {
            const secret = getUnlockedSecret();
            const txHash = await clientExecutePlan(data.plan as ClientTxPlan, secret);
            const fin = await fetch(opts.finalizeUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ intentId: opts.intentId, txHash }),
            });
            const finData = (await fin.json().catch(() => ({}))) as Record<string, unknown>;
            if (!fin.ok) {
                return { ok: false, error: String(finData.error ?? 'Could not finalize transaction.') };
            }
            return { ok: true, data: finData };
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not sign transaction.';
            if (msg.includes('Unlock your wallet')) {
                return { ok: false, error: 'Unlock your wallet to sign this transaction.' };
            }
            return { ok: false, error: msg };
        }
    }

    return { ok: true, data };
}
