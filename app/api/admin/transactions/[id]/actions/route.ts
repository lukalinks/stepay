import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { canRunOps, getAdminContext } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/admin-audit';
import { tryCompleteStuckTxById } from '@/lib/recover-stuck-ops';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const ctx = await getAdminContext(request);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canRunOps(ctx.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'retry');

    try {
        if (action === 'retry') {
            const result = await tryCompleteStuckTxById(id);
            await logAdminAction({
                adminUserId: ctx.userId,
                action: 'tx.retry_stuck',
                targetType: 'transaction',
                targetId: id,
                details: { result },
                ip: ctx.ip,
            });
            return NextResponse.json({ ok: true, result });
        }

        if (action === 'mark_failed') {
            const reason = String(body.reason || 'Marked failed by admin').slice(0, 500);
            const updated = await sql`
                UPDATE transactions
                SET status = 'FAILED', updated_at = NOW()
                WHERE id = ${id} AND status IN ('PENDING', 'PROCESSING')
                RETURNING id
            `;
            if (!(updated as unknown[]).length) {
                return NextResponse.json({ error: 'Transaction not in retryable state' }, { status: 400 });
            }
            await logAdminAction({
                adminUserId: ctx.userId,
                action: 'tx.mark_failed',
                targetType: 'transaction',
                targetId: id,
                details: { reason },
                ip: ctx.ip,
            });
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (err) {
        console.error('Admin tx action:', err);
        return NextResponse.json({ error: 'Action failed' }, { status: 500 });
    }
}
