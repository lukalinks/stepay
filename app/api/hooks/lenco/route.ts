import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
    claimPendingBuyTransaction,
    findBuyTransactionByReference,
} from '@/lib/deposit-claim';
import { creditBuyDeposit, isLencoDepositPaid } from '@/lib/complete-buy-deposit';
import { failBuyTransactionByReference } from '@/lib/deposit-claim';
import { notifyDepositFailed } from '@/lib/deposit-notify';
import { createHmac, createHash, timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';

function isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
}

/** GET: Verify webhook URL is reachable */
export async function GET() {
    return NextResponse.json({
        ok: true,
        webhook: 'lenco',
        message: 'Stepay Lenco webhook is active. Use POST for webhook events.',
    });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}

function getWebhookHashKey(): string | null {
    const secret = process.env.LENCO_WEBHOOK_SECRET?.trim();
    if (secret) return secret;
    const apiKey = process.env.LENCO_SECRET_KEY?.trim();
    if (!apiKey) return null;
    return createHash('sha256').update(apiKey).digest('hex');
}

function verifySignature(payload: string, signature: string | null): boolean {
    const key = getWebhookHashKey();
    if (!key || !signature) return false;
    try {
        const expected = createHmac('sha512', key).update(payload).digest('hex');
        const a = Buffer.from(expected, 'utf8');
        const b = Buffer.from(signature, 'utf8');
        if (a.length !== b.length) return false;
        return timingSafeEqual(a, b);
    } catch {
        return false;
    }
}

function extractReference(body: Record<string, unknown>, data: Record<string, unknown>): string | null {
    const ref =
        (data.clientReference as string) ??
        (data.client_reference as string) ??
        (data.reference as string) ??
        (body.reference as string);
    return ref && typeof ref === 'string' ? ref.trim() : null;
}

export async function POST(request: Request) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get('x-lenco-signature') ?? request.headers.get('X-Lenco-Signature');
        const key = getWebhookHashKey();

        if (!key) {
            console.error('Lenco webhook: LENCO_WEBHOOK_SECRET or LENCO_SECRET_KEY not set');
            return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
        }

        if (!signature || !verifySignature(rawBody, signature)) {
            console.warn('Lenco webhook: invalid or missing signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        if (isProduction() && process.env.LENCO_SKIP_DEPOSIT_VERIFICATION === 'true') {
            console.error('Lenco webhook: LENCO_SKIP_DEPOSIT_VERIFICATION must not be set in production');
            return NextResponse.json({ error: 'Unsafe configuration' }, { status: 503 });
        }

        const body = JSON.parse(rawBody) as Record<string, unknown>;
        const data = (body.data as Record<string, unknown>) || body;
        const reference = extractReference(body, data);
        const status = (data.status ?? body.status) as string | undefined;
        const event = body.event as string | undefined;
        const type = (body.type ?? data.type) as string | undefined;

        const isSuccess = status === 'success' || status === 'successful';
        const isFailed = status === 'failed' || status === 'failure' || status === 'cancelled';
        const isCollection =
            type === 'collection' ||
            event === 'transaction.successful' ||
            event === 'transaction.failed' ||
            (isSuccess && !!reference) ||
            (isFailed && !!reference);

        if (!reference) {
            return NextResponse.json({ received: true });
        }

        if (isFailed && isCollection) {
            const failedTx = await failBuyTransactionByReference(reference);
            if (failedTx) {
                await notifyDepositFailed(
                    failedTx,
                    'Your mobile money payment was declined, cancelled, or expired.'
                );
            }
            return NextResponse.json({ received: true });
        }

        if (isSuccess && isCollection) {
            const existing = await findBuyTransactionByReference(reference);
            if (existing) {
                const st = String(existing.status);
                if (st === 'COMPLETED' || st === 'PROCESSING') {
                    return NextResponse.json({ received: true });
                }
            }

            const skipVerification = process.env.LENCO_SKIP_DEPOSIT_VERIFICATION === 'true';
            if (!skipVerification) {
                const isVerified = await isLencoDepositPaid(reference);
                if (!isVerified) {
                    console.log(`Lenco webhook: reference ${reference} not yet successful or unverified, skipping`);
                    return NextResponse.json({ received: true });
                }
            }

            const tx = await claimPendingBuyTransaction(reference);
            if (!tx || tx.type !== 'BUY') {
                return NextResponse.json({ received: true });
            }

            const result = await creditBuyDeposit(tx, reference);
            if (!result.ok && result.reason === 'waiting_trustline') {
                await sql`
                    UPDATE transactions
                    SET status = 'PENDING', updated_at = NOW()
                    WHERE id = ${String(tx.id)} AND status = 'PROCESSING'
                `;
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Lenco webhook error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
