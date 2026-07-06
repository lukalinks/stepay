import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { tryCompleteUserStuckOps } from '@/lib/recover-stuck-ops';

/** Complete stuck swap / cash-out rows when crypto reached the platform but finalize failed. */
export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const results = await tryCompleteUserStuckOps(userId);
        const completed = results.filter((r) => r.status === 'completed').length;

        return NextResponse.json({ ok: true, completed, results });
    } catch (err) {
        console.error('retry-stuck ops error:', err);
        return NextResponse.json({ error: 'Could not retry pending operations' }, { status: 500 });
    }
}
