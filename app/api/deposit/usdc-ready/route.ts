import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getUsdcDepositReadiness, prepareUsdcDepositWallet } from '@/lib/usdc-deposit-ready';

/** GET: Whether this wallet can receive USDC right now. */
export async function GET(request: Request) {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const readiness = await getUsdcDepositReadiness(userId);
    if (!readiness) {
        return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    return NextResponse.json(readiness, {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
}

/** POST: Prepare XLM reserve + trustline before initiating a USDC mobile-money deposit. */
export async function POST(request: Request) {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const readiness = await getUsdcDepositReadiness(userId);
    if (!readiness) {
        return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Already receivable — no work needed.
    if (readiness.hasTrustline) {
        return NextResponse.json({ ...readiness, ready: true });
    }

    // Waiting on paid activation — expected; do not 400 (avoids console spam / retries).
    if (readiness.activationRequired) {
        return NextResponse.json({
            ...readiness,
            ready: false,
            deferredActivation: true,
            code: 'activation_required',
        });
    }

    const result = await prepareUsdcDepositWallet(userId);
    if (!result.ok) {
        return NextResponse.json(
            {
                ...readiness,
                ready: false,
                code: result.code,
                error: result.error,
            },
            { status: 400 }
        );
    }

    return NextResponse.json({
        ...readiness,
        ready: result.ready,
        deferredActivation: Boolean(result.deferredActivation),
        needsUnlock: Boolean(result.needsUnlock ?? readiness.needsUnlock),
        code: result.code,
        hasTrustline: result.ready ? true : readiness.hasTrustline,
    });
}
