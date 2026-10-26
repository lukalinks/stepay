import { NextResponse } from 'next/server';
import { canManageTeam, getAdminContext } from '@/lib/admin-auth';
import { revokeTeamMember, updateTeamRole } from '@/lib/admin-team';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const ctx = await getAdminContext(request);
    if (!ctx) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canManageTeam(ctx.role)) {
        return NextResponse.json({ error: 'Only superadmins can change team roles.' }, { status: 403 });
    }
    try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const role = typeof body.role === 'string' ? body.role : '';
        if (!role) {
            return NextResponse.json({ error: 'Role is required' }, { status: 400 });
        }
        await updateTeamRole({
            actorId: ctx.userId,
            actorIp: ctx.ip,
            targetId: id,
            role,
        });
        return NextResponse.json({ success: true });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not update role';
        const status =
            msg.includes('last superadmin') ||
            msg.includes('demote') ||
            msg.includes('Invalid') ||
            msg.includes('not found')
                ? 400
                : 500;
        if (status === 500) console.error('Admin team PATCH:', err);
        return NextResponse.json({ error: msg }, { status });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const ctx = await getAdminContext(request);
    if (!ctx) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canManageTeam(ctx.role)) {
        return NextResponse.json({ error: 'Only superadmins can remove team members.' }, { status: 403 });
    }
    try {
        const { id } = await params;
        await revokeTeamMember({
            actorId: ctx.userId,
            actorIp: ctx.ip,
            targetId: id,
        });
        return NextResponse.json({ success: true });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not remove member';
        const status =
            msg.includes('yourself') || msg.includes('last superadmin') || msg.includes('not found')
                ? 400
                : 500;
        if (status === 500) console.error('Admin team DELETE:', err);
        return NextResponse.json({ error: msg }, { status });
    }
}
