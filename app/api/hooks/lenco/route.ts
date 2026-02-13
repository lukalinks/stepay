import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { StellarService } from '@/lib/stellar';
import { createHmac, createHash } from 'crypto';

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

export async function POST(request: Request) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get('x-lenco-signature');
        const key = getWebhookHashKey();
        if (key) {
            if (!signature || !verifySignature(rawBody, signature)) {
                console.warn('Lenco webhook: invalid or missing signature');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        }

        const body = JSON.parse(rawBody);
        // Lenco sends { event, data } or flat { reference, status, type }
        const event = body.event;
        const data = body.data || body;
        const reference = data.clientReference ?? data.reference ?? body.reference;
        const status = data.status ?? body.status;
        const type = body.type ?? (event === 'transaction.successful' ? 'collection' : null);

        if (!reference) {
            return NextResponse.json({ received: true });
        }

        if ((status === 'success' || status === 'successful') && (type === 'collection' || event === 'transaction.successful')) {
            const { data: tx } = await supabase
                .from('transactions')
                .select('*')
                .eq('reference', reference)
                .single();

            if (tx) {
                const { data: user } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', tx.user_id)
                    .single();

                if (user) {
                    const platformSecret = process.env.PLATFORM_WALLET_SECRET?.trim();
                    if (platformSecret) {
                        try {
                            const asset = tx.asset || 'xlm';
                            let txHash: string;

                            if (asset === 'usdc') {
                                await StellarService.ensureUSDCTrustline(user.wallet_secret);
                                txHash = await StellarService.sendUSDC(
                                    platformSecret,
                                    user.wallet_public,
                                    tx.amount_xlm.toString()
                                );
                            } else {
                                txHash = await StellarService.sendXLM(
                                    platformSecret,
                                    user.wallet_public,
                                    tx.amount_xlm.toString()
                                );
                            }

                            await supabase
                                .from('transactions')
                                .update({ status: 'COMPLETED', tx_hash: txHash })
                                .eq('id', tx.id);
                        } catch (stellarError) {
                            console.error('Webhook: Stellar send failed for', reference, stellarError);
                            await supabase
                                .from('transactions')
                                .update({ status: 'FAILED' })
                                .eq('id', tx.id);
                        }
                    } else {
                        console.error('Webhook: PLATFORM_WALLET_SECRET not configured for', reference);
                    }
                }
            }
            console.log(`Processed successful payment for ${reference}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
