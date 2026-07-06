import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAdminContext } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/admin-audit';

function csvEscape(val: unknown): string {
    const s = val == null ? '' : String(val);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
    const lines = [headers.join(',')];
    for (const row of rows) {
        lines.push(headers.map((h) => csvEscape(row[h])).join(','));
    }
    return lines.join('\n');
}

export async function GET(request: Request) {
    const ctx = await getAdminContext(request);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'transactions';
    const limit = Math.min(5000, parseInt(searchParams.get('limit') || '2000', 10));

    try {
        let csv = '';
        let filename = 'export.csv';

        if (type === 'users') {
            const rows = await sql`
                SELECT id, email, phone_number, role, kyc_tier, country_code, wallet_public,
                       suspended, created_at
                FROM users ORDER BY created_at DESC LIMIT ${limit}
            `;
            const data = (rows as Record<string, unknown>[]).map((r) => ({
                id: r.id,
                email: r.email,
                phone: r.phone_number,
                role: r.role,
                kyc_tier: r.kyc_tier,
                country: r.country_code,
                wallet: r.wallet_public,
                suspended: r.suspended,
                created_at: r.created_at,
            }));
            csv = toCsv(['id', 'email', 'phone', 'role', 'kyc_tier', 'country', 'wallet', 'suspended', 'created_at'], data);
            filename = 'stepay-users.csv';
        } else if (type === 'alerts') {
            const rows = await sql`
                SELECT ca.id, ca.alert_type, ca.severity, ca.message, ca.resolved, ca.created_at,
                       u.email AS user_email
                FROM compliance_alerts ca
                LEFT JOIN users u ON u.id = ca.user_id
                ORDER BY ca.created_at DESC LIMIT ${limit}
            `;
            const data = (rows as Record<string, unknown>[]).map((r) => ({
                id: r.id,
                alert_type: r.alert_type,
                severity: r.severity,
                message: r.message,
                resolved: r.resolved,
                user_email: r.user_email,
                created_at: r.created_at,
            }));
            csv = toCsv(['id', 'alert_type', 'severity', 'message', 'resolved', 'user_email', 'created_at'], data);
            filename = 'stepay-alerts.csv';
        } else {
            const rows = await sql`
                SELECT t.id, t.type, t.status, t.amount_fiat, t.amount_xlm, t.asset, t.reference,
                       t.tx_hash, t.created_at, u.email AS user_email, u.phone_number AS user_phone
                FROM transactions t
                JOIN users u ON u.id = t.user_id
                ORDER BY t.created_at DESC LIMIT ${limit}
            `;
            const data = (rows as Record<string, unknown>[]).map((r) => ({
                id: r.id,
                type: r.type,
                status: r.status,
                amount_fiat: r.amount_fiat,
                amount_xlm: r.amount_xlm,
                asset: r.asset,
                reference: r.reference,
                tx_hash: r.tx_hash,
                user_email: r.user_email,
                user_phone: r.user_phone,
                created_at: r.created_at,
            }));
            csv = toCsv(
                ['id', 'type', 'status', 'amount_fiat', 'amount_xlm', 'asset', 'reference', 'tx_hash', 'user_email', 'user_phone', 'created_at'],
                data
            );
            filename = 'stepay-transactions.csv';
        }

        await logAdminAction({
            adminUserId: ctx.userId,
            action: 'export.csv',
            details: { type, limit },
            ip: ctx.ip,
        });

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (err) {
        console.error('Admin export:', err);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}
