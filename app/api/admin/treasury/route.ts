import { NextResponse } from 'next/server';
import { getAdminContext, canRunOps } from '@/lib/admin-auth';
import { getTreasurySnapshot } from '@/lib/admin-treasury';

export async function GET(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canRunOps(ctx.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    try {
        const snapshot = await getTreasurySnapshot();
        return NextResponse.json(snapshot);
    } catch (err) {
        console.error('Admin treasury:', err);
        return NextResponse.json({ error: 'Failed to load treasury' }, { status: 500 });
    }
}
