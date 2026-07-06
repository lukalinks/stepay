import { NextResponse } from 'next/server';
import { getAdminContext } from '@/lib/admin-auth';
import { getAdminHealth } from '@/lib/admin-health';

export async function GET(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const health = await getAdminHealth();
        return NextResponse.json(health);
    } catch (err) {
        console.error('Admin health:', err);
        return NextResponse.json({ error: 'Failed to check health' }, { status: 500 });
    }
}
