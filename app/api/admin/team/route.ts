import { NextResponse } from 'next/server';
import { canManageTeam, getAdminContext } from '@/lib/admin-auth';
import { inviteAdmin, listTeamMembers } from '@/lib/admin-team';

export async function GET(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canManageTeam(ctx.role)) {
        return NextResponse.json({ error: 'Only superadmins can manage the team.' }, { status: 403 });
    }
    try {
        const members = await listTeamMembers(ctx.userId);
        return NextResponse.json({ members });
    } catch (err) {
        console.error('Admin team GET:', err);
        return NextResponse.json({ error: 'Failed to load team' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canManageTeam(ctx.role)) {
        return NextResponse.json({ error: 'Only superadmins can invite admins.' }, { status: 403 });
    }
    try {
        const body = await request.json().catch(() => ({}));
        const email = typeof body.email === 'string' ? body.email : '';
        const role = typeof body.role === 'string' ? body.role : 'admin_support';
        const fullName = typeof body.fullName === 'string' ? body.fullName : undefined;

        const result = await inviteAdmin({
            actorId: ctx.userId,
            actorIp: ctx.ip,
            email,
            role,
            fullName,
        });

        return NextResponse.json({
            success: true,
            member: result.member,
            created: result.created,
            temporaryPassword: result.temporaryPassword ?? null,
            emailed: !result.temporaryPassword,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not invite admin';
        const status =
            msg.includes('valid') ||
            msg.includes('Invalid') ||
            msg.includes('already') ||
            msg.includes('suspended')
                ? 400
                : 500;
        if (status === 500) console.error('Admin team POST:', err);
        return NextResponse.json({ error: msg }, { status });
    }
}
