import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { StellarService } from '@/lib/stellar';
import { parseStellarError } from '@/lib/stellar-error';
import { LencoService } from '@/lib/lenco';
import { createHmac, createHash } from 'crypto';

export const dynamic = 'force-dynamic';

/** GET: Verify webhook URL is reachable */
export async function GET() {
    return NextResponse.json({
        ok: true,
        webhook: 'lenco',
        message: 'Stepay Lenco webhook is active. Use POST for webhook events.',
    });
}

/** OPTIONS: CORS preflight - some clients send this before POST */
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
        return expected === signature;
    } catch {
        return false;
    }
}

/** Extract reference from Lenco webhook payload (supports multiple formats) */
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
        if (key) {
            if (!signature || !verifySignature(rawBody, signature)) {
                console.warn('Lenco webhook: invalid or missing signature');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        } else {
            console.warn('Lenco webhook: LENCO_WEBHOOK_SECRET or LENCO_SECRET_KEY not set - signature not verified');
        }

        const body = JSON.parse(rawBody) as Record<string, unknown>;
        const data = (body.data as Record<string, unknown>) || body;
        const reference = extractReference(body, data);
        const status = (data.status ?? body.status) as string | undefined;
        const event = body.event as string | undefined;
        const type = (body.type ?? data.type) as string | undefined;

        const isSuccess = status === 'success' || status === 'successful';
        const isCollection =
            type === 'collection' ||
            event === 'transaction.successful' ||
            (isSuccess && !!reference);

        if (!reference) {
            return NextResponse.json({ received: true });
        }

        if (isSuccess && isCollection) {
            const { data: tx } = await supabase
                .from('transactions')
                .select('*')
                .eq('reference', reference)
                .single();

            if (tx && tx.type === 'BUY') {
                if (tx.status === 'COMPLETED') {
                    console.log(`Lenco webhook: reference ${reference} already completed, skipping (idempotent)`);
                    return NextResponse.json({ received: true });
                }

                const skipVerification = process.env.LENCO_SKIP_DEPOSIT_VERIFICATION === 'true';
                if (!skipVerification) {
                    let isVerified = false;
                    const collection = await LencoService.getCollectionByReference(reference);
                    if (collection && collection.status === 'successful') {
                        isVerified = true;
                    } else {
                        const lencoTx = await LencoService.getTransactionByReference(reference);
                        if (lencoTx && lencoTx.status === 'successful' && lencoTx.type === 'credit') {
                            isVerified = true;
                        }
                    }
                    if (!isVerified) {
                        console.log(`Lenco webhook: reference ${reference} not yet successful or unverified, skipping`);
                        return NextResponse.json({ received: true });
                    }
                }

                const { data: user } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', tx.user_id)
                    .single();

                if (user) {
                    const walletSecret = (user.wallet_secret ?? (user as { walletSecret?: string }).walletSecret) as string;
                    const walletPublic = (user.wallet_public ?? (user as { walletPublic?: string }).walletPublic) as string;

                    if (!walletSecret || !walletPublic) {
                        console.error('Lenco webhook: user missing wallet credentials for', reference);
                        await supabase.from('transactions').update({ status: 'FAILED' }).eq('id', tx.id);
                        return NextResponse.json({ received: true });
                    }

                    const platformSecret = process.env.PLATFORM_WALLET_SECRET?.trim();
                    if (!platformSecret) {
                        console.error('Lenco webhook: PLATFORM_WALLET_SECRET not configured');
                        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
                    }

                    try {
                        const asset = (tx.asset || 'xlm') as string;
                        const amountStr = Number(tx.amount_xlm).toFixed(7);
                        let txHash: string;

                        if (asset === 'usdc') {
                            await StellarService.ensureUSDCTrustline(walletSecret);
                            txHash = await StellarService.sendUSDC(platformSecret, walletPublic, amountStr);
                        } else {
                            txHash = await StellarService.sendXLM(platformSecret, walletPublic, amountStr);
                        }

                        await supabase
                            .from('transactions')
                            .update({ status: 'COMPLETED', tx_hash: txHash })
                            .eq('id', tx.id);
                        console.log(`Lenco webhook: completed deposit for ${reference}, txHash ${txHash}`);
                    } catch (stellarError) {
                        const errMsg = parseStellarError(stellarError);
                        console.error('Lenco webhook: Stellar send failed for', reference, errMsg);
                        await supabase.from('transactions').update({ status: 'FAILED' }).eq('id', tx.id);
                    }
                } else {
                    console.warn('Lenco webhook: no user found for tx', reference);
                }
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Lenco webhook error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
