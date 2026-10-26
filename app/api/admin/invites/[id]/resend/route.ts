import { NextResponse } from 'next/server';
import { canChangeSettings, getAdminContext } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/admin-audit';
import { resendInvite } from '@/lib/access-control';

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
        const body = await request.json().catch(() => ({}));
        const phone =
            typeof body.phone === 'string' ? body.phone.trim() : body.phone === null ? null : undefined;
        const { emailed, whatsapped, whatsAppUrl, invite } = await resendInvite(id, phone);
        await logAdminAction({
            adminUserId: ctx.userId,
            action: 'invite.resend',
            details: { inviteId: id, phone: invite.phone, emailed, whatsapped },
            ip: ctx.ip,
        });
        return NextResponse.json({ success: true, emailed, whatsapped, whatsAppUrl, invite });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not resend invite';
        const status =
            msg.includes('not found') ||
            msg.includes('revoked') ||
            msg.includes('accepted') ||
            msg.includes('Zambian')
                ? 400
                : 500;
        if (status === 500) console.error('Admin invite resend:', err);
        return NextResponse.json({ error: msg }, { status });
    }
}
