import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAdminContext } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/admin-audit';

export async function GET(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const unresolvedOnly = searchParams.get('unresolved') === 'true';

        const alerts = unresolvedOnly
            ? await sql`
                SELECT a.*, u.email AS user_email
                FROM compliance_alerts a
                LEFT JOIN users u ON u.id = a.user_id
                WHERE a.resolved = false
                ORDER BY a.created_at DESC
                LIMIT 100
              `
            : await sql`
                SELECT a.*, u.email AS user_email
                FROM compliance_alerts a
                LEFT JOIN users u ON u.id = a.user_id
                ORDER BY a.created_at DESC
                LIMIT 100
              `;

        const tierStats = await sql`
            SELECT kyc_tier, COUNT(*)::int AS c FROM users GROUP BY kyc_tier
        `;

        const pendingPhone = await sql`
            SELECT COUNT(*)::int AS c FROM pending_phone_transfers WHERE status = 'pending'
        `;

        const volume24h = await sql`
            SELECT
                COUNT(*)::int AS tx_count,
                COALESCE(SUM(amount_xlm), 0)::float AS volume
            FROM transactions
            WHERE created_at >= NOW() - INTERVAL '24 hours' AND status = 'COMPLETED'
        `;

        return NextResponse.json({
            alerts,
            tierStats,
            pendingPhoneTransfers: (pendingPhone[0] as { c: number })?.c ?? 0,
            last24h: volume24h[0],
        });
    } catch (err) {
        console.error('Admin compliance GET:', err);
        return NextResponse.json({ error: 'Failed to load compliance data' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const alertId = typeof body.alertId === 'string' ? body.alertId : '';
        if (!alertId) {
            return NextResponse.json({ error: 'alertId required' }, { status: 400 });
        }

        await sql`UPDATE compliance_alerts SET resolved = true WHERE id = ${alertId}`;
        await logAdminAction({
            adminUserId: ctx.userId,
            action: 'compliance.resolve_alert',
            targetType: 'compliance_alert',
            targetId: alertId,
            ip: ctx.ip,
        });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Admin compliance PATCH:', err);
        return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
    }
}
