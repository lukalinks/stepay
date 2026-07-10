import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAdminContext } from '@/lib/admin-auth';

export async function GET(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    try {
        const [merchantCount, checkoutStats, recentCheckouts, failedWebhooks] = await Promise.all([
            sql`SELECT COUNT(DISTINCT merchant_user_id)::int AS c FROM merchant_checkouts`,
            sql`
                SELECT status, COUNT(*)::int AS c FROM merchant_checkouts
                GROUP BY status
            `,
            sql`
                SELECT mc.id, mc.checkout_token, mc.amount, mc.asset, mc.label, mc.status,
                       mc.created_at, mc.paid_at, u.email AS merchant_email
                FROM merchant_checkouts mc
                JOIN users u ON u.id = mc.merchant_user_id
                ORDER BY mc.created_at DESC
                LIMIT ${limit} OFFSET ${offset}
            `,
            sql`
                SELECT wd.id, wd.event_type, wd.response_status, wd.delivered_at, wd.webhook_url,
                       mc.label, mc.checkout_token, u.email AS merchant_email
                FROM merchant_webhook_deliveries wd
                JOIN merchant_checkouts mc ON mc.id = wd.checkout_id
                JOIN users u ON u.id = mc.merchant_user_id
                WHERE wd.response_status IS NULL OR wd.response_status >= 400
                ORDER BY wd.delivered_at DESC
                LIMIT 20
            `,
        ]);

        const apiKeyStats = await sql`
            SELECT COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE revoked_at IS NULL)::int AS active
            FROM merchant_api_keys
        `;

        const totalCheckouts = await sql`SELECT COUNT(*)::int AS c FROM merchant_checkouts`;

        return NextResponse.json({
            merchantCount: (merchantCount[0] as { c: number }).c,
            checkoutStats: checkoutStats as unknown as { status: string; c: number }[],
            apiKeys: apiKeyStats[0],
            checkouts: (recentCheckouts as Record<string, unknown>[]).map((c) => ({
                id: c.id,
                token: c.checkout_token,
                amount: c.amount,
                asset: c.asset,
                label: c.label,
                status: c.status,
                createdAt: c.created_at,
                paidAt: c.paid_at,
                merchantEmail: c.merchant_email,
            })),
            failedWebhooks: (failedWebhooks as Record<string, unknown>[]).map((w) => ({
                id: w.id,
                eventType: w.event_type,
                responseStatus: w.response_status,
                deliveredAt: w.delivered_at,
                webhookUrl: w.webhook_url,
                checkoutLabel: w.label,
                checkoutToken: w.checkout_token,
                merchantEmail: w.merchant_email,
            })),
            totalCheckouts: (totalCheckouts[0] as { c: number }).c,
        });
    } catch (err) {
        console.error('Admin merchants:', err);
        return NextResponse.json({ error: 'Failed to load merchants' }, { status: 500 });
    }
}
