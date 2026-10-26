import { NextResponse } from 'next/server';
import { canChangeSettings, getAdminContext } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/admin-audit';
import { createAndSendInvite, inviteSignupUrl, listInvites } from '@/lib/access-control';
import { inviteWhatsAppMessage } from '@/lib/notifications';
import { whatsAppShareUrl } from '@/lib/share';

export async function GET(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const invites = await listInvites(100);
        return NextResponse.json({
            invites: invites.map((inv) => ({
                ...inv,
                whatsAppUrl: whatsAppShareUrl(
                    inviteWhatsAppMessage(inviteSignupUrl(inv.token)),
                    inv.phone
                ),
            })),
        });
    } catch (err) {
        console.error('Admin invites GET:', err);
        return NextResponse.json({ error: 'Failed to load invites' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canChangeSettings(ctx.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    try {
        const body = await request.json().catch(() => ({}));
        const email = typeof body.email === 'string' ? body.email.trim() : '';
        const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
        if (!email.includes('@')) {
            return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
        }

        const { invite, emailed, whatsapped, whatsAppUrl } = await createAndSendInvite(
            email,
            ctx.userId,
            phone || null
        );
        await logAdminAction({
            adminUserId: ctx.userId,
            action: 'invite.create',
            details: { email: invite.email, phone: invite.phone, emailed, whatsapped },
            ip: ctx.ip,
        });
        return NextResponse.json({ success: true, invite, emailed, whatsapped, whatsAppUrl });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not create invite';
        const status =
            msg.includes('already') || msg.includes('valid') || msg.includes('Zambian') ? 400 : 500;
        if (status === 500) console.error('Admin invites POST:', err);
        return NextResponse.json({ error: msg }, { status });
    }
}
