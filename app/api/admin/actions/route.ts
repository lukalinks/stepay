import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAdminContext } from '@/lib/admin-auth';

export async function GET(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(200, parseInt(searchParams.get('limit') || '100', 10));

    try {
        const rows = await sql`
            SELECT aa.id, aa.action, aa.target_type, aa.target_id, aa.details, aa.ip, aa.created_at,
                   u.email AS admin_email
            FROM admin_actions aa
            JOIN users u ON u.id = aa.admin_user_id
            ORDER BY aa.created_at DESC
            LIMIT ${limit}
        `;

        return NextResponse.json({
            actions: (rows as Record<string, unknown>[]).map((r) => ({
                id: r.id,
                action: r.action,
                targetType: r.target_type,
                targetId: r.target_id,
                details: r.details,
                ip: r.ip,
                createdAt: r.created_at,
                adminEmail: r.admin_email,
            })),
        });
    } catch (err) {
        console.error('Admin actions log:', err);
        return NextResponse.json({ error: 'Failed to load admin actions' }, { status: 500 });
    }
}
