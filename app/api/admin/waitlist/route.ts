import { NextResponse } from 'next/server';
import { getAdminContext } from '@/lib/admin-auth';
import { listWaitlist, waitlistCount } from '@/lib/access-control';

export async function GET(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const [entries, counts] = await Promise.all([listWaitlist(100), waitlistCount()]);
        return NextResponse.json({ entries, ...counts });
    } catch (err) {
        console.error('Admin waitlist GET:', err);
        return NextResponse.json({ error: 'Failed to load waitlist' }, { status: 500 });
    }
}
