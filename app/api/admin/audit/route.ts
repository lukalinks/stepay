import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: Request) {
    const adminId = await requireAdmin(request);
    if (!adminId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(Number(searchParams.get('limit') || 100), 500);

        const rows = await sql`
            SELECT
                a.id,
                a.user_id,
                a.intent_id,
                a.reason,
                a.tx_hash,
                a.ip,
                a.created_at,
                u.email AS user_email
            FROM sign_audit_log a
            LEFT JOIN users u ON u.id = a.user_id
            ORDER BY a.created_at DESC
            LIMIT ${limit}
        `;

        const intentStats = await sql`
            SELECT status, COUNT(*)::int AS c
            FROM sign_intents
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY status
        `;

        const encryptedCount = await sql`
            SELECT
                COUNT(*) FILTER (WHERE wallet_secret_enc IS NOT NULL)::int AS encrypted,
                COUNT(*) FILTER (WHERE wallet_secret IS NOT NULL AND wallet_secret != '')::int AS plaintext
            FROM users
        `;

        return NextResponse.json({
            audit: rows,
            intentStats,
            walletStorage: encryptedCount[0],
            encryptionConfigured: !!process.env.WALLET_ENCRYPTION_KEY?.trim(),
        });
    } catch (err) {
        console.error('Admin audit:', err);
        return NextResponse.json({ error: 'Failed to load audit log' }, { status: 500 });
    }
}
