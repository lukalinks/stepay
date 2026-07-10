import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { LencoService } from '@/lib/lenco';
import { getAdminContext } from '@/lib/admin-auth';
import { coerceIntentPayload } from '@/lib/intent-payload';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const ctx = await getAdminContext(request);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    try {
        const rows = await sql`
            SELECT t.*, u.email, u.phone_number, u.wallet_public, u.kyc_tier
            FROM transactions t
            JOIN users u ON u.id = t.user_id
            WHERE t.id = ${id}
            LIMIT 1
        `;
        const tx = rows[0] as Record<string, unknown> | undefined;
        if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const reference = String(tx.reference ?? '');
        const type = String(tx.type ?? '');

        const intentRows = await sql`
            SELECT id, type, status, created_at, confirmed_at, payload
            FROM sign_intents
            WHERE user_id = ${tx.user_id as string}
              AND type = ${type === 'SWAP' ? 'SWAP' : type === 'SELL' ? 'SELL' : type}
              AND (
                payload::text LIKE ${'%' + id + '%'}
                OR payload::text LIKE ${'%' + reference + '%'}
              )
            ORDER BY created_at DESC
            LIMIT 5
        `;

        const intents = (intentRows as Record<string, unknown>[]).map((r) => ({
            id: r.id,
            type: r.type,
            status: r.status,
            createdAt: r.created_at,
            confirmedAt: r.confirmed_at,
            payload: coerceIntentPayload(r.payload),
        }));

        let lencoStatus: { status: string; amount?: number } | null = null;
        if (type === 'BUY' || type === 'SELL') {
            try {
                if (type === 'BUY') {
                    lencoStatus = await LencoService.getCollectionByReference(reference);
                } else {
                    const legacy = await LencoService.getTransactionByReference(reference);
                    lencoStatus = legacy ? { status: legacy.status } : null;
                }
            } catch {
                // ignore
            }
        }

        let webhooks: Record<string, unknown>[] = [];
        if (reference.startsWith('CHK-') || reference.includes('checkout')) {
            const wh = await sql`
                SELECT wd.id, wd.event_type, wd.response_status, wd.delivered_at, wd.webhook_url
                FROM merchant_webhook_deliveries wd
                JOIN merchant_checkouts mc ON mc.id = wd.checkout_id
                WHERE mc.reference_id = ${reference} OR mc.checkout_token = ${reference}
                ORDER BY wd.delivered_at DESC
                LIMIT 10
            `;
            webhooks = wh as Record<string, unknown>[];
        }

        return NextResponse.json({
            transaction: {
                id: tx.id,
                type: tx.type,
                asset: tx.asset || 'xlm',
                amountFiat: tx.amount_fiat,
                amountXlm: tx.amount_xlm,
                status: tx.status,
                reference: tx.reference,
                txHash: tx.tx_hash,
                depositMemo: tx.deposit_memo,
                createdAt: tx.created_at,
                updatedAt: tx.updated_at,
            },
            user: {
                id: tx.user_id,
                email: tx.email ?? '—',
                phone: tx.phone_number ?? '—',
                wallet: tx.wallet_public,
                kycTier: tx.kyc_tier ?? 'basic',
            },
            intents,
            lencoStatus,
            webhooks: webhooks.map((w) => ({
                id: w.id,
                eventType: w.event_type,
                responseStatus: w.response_status,
                deliveredAt: w.delivered_at,
                webhookUrl: w.webhook_url,
            })),
        });
    } catch (err) {
        console.error('Admin tx detail:', err);
        return NextResponse.json({ error: 'Failed to load transaction' }, { status: 500 });
    }
}
