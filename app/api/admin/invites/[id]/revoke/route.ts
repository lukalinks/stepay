import { NextResponse } from 'next/server';
import { canChangeSettings, getAdminContext } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/admin-audit';
import { revokeInvite } from '@/lib/access-control';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    const ctx = await getAdminContext(request);
    if (!ctx) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canChangeSettings(ctx.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    try {
        const { id } = await context.params;
        await revokeInvite(id);
        await logAdminAction({
            adminUserId: ctx.userId,
            action: 'invite.revoke',
            details: { inviteId: id },
            ip: ctx.ip,
        });
        return NextResponse.json({ success: true });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not revoke invite';
        const status = msg.includes('not found') ? 400 : 500;
        if (status === 500) console.error('Admin invite revoke:', err);
        return NextResponse.json({ error: msg }, { status });
    }
}
