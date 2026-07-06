import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { canRunOps, getAdminContext } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/admin-audit';
import { listStuckTransactions, retryAllStuckOps } from '@/lib/recover-stuck-ops';

export async function GET(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const stuck = await listStuckTransactions(50);
        const userIds = [...new Set(stuck.map((t) => t.user_id))];
        let userMap = new Map<string, { email?: string; phone_number?: string }>();
        if (userIds.length) {
            const users = await sql`
                SELECT id, email, phone_number FROM users WHERE id IN ${sql(userIds)}
            `;
            for (const u of users as unknown as { id: string; email?: string; phone_number?: string }[]) {
                userMap.set(u.id, u);
            }
        }

        const items = stuck.map((t) => {
            const u = userMap.get(t.user_id);
            return {
                id: t.id,
                userId: t.user_id,
                type: t.type,
                status: t.status,
                reference: t.reference,
                depositMemo: t.deposit_memo,
                amountFiat: t.amount_fiat,
                amountXlm: t.amount_xlm,
                asset: t.asset,
                userEmail: u?.email ?? '—',
                userPhone: u?.phone_number ?? '—',
            };
        });

        return NextResponse.json({ stuck: items, count: items.length });
    } catch (err) {
        console.error('Admin stuck queue:', err);
        return NextResponse.json({ error: 'Failed to load stuck queue' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canRunOps(ctx.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    try {
        const results = await retryAllStuckOps();
        const completed = results.filter((r) => r.status === 'completed').length;
        await logAdminAction({
            adminUserId: ctx.userId,
            action: 'ops.retry_all_stuck',
            details: { completed, total: results.length },
            ip: ctx.ip,
        });
        return NextResponse.json({ ok: true, completed, results });
    } catch (err) {
        console.error('Admin retry all stuck:', err);
        return NextResponse.json({ error: 'Retry failed' }, { status: 500 });
    }
}
