import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { canManageUsers, canRunOps, getAdminContext } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/admin-audit';
import { tryCompleteUserStuckOps } from '@/lib/recover-stuck-ops';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const ctx = await getAdminContext(request);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    try {
        const rows = await sql`
            SELECT id, email, phone_number, role, created_at, wallet_public, country_code, kyc_tier,
                   suspended, suspended_reason, session_token_version
            FROM users WHERE id = ${id} LIMIT 1
        `;
        const user = rows[0] as Record<string, unknown> | undefined;
        if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const [txRows, alertRows, checkoutCount] = await Promise.all([
            sql`
                SELECT id, type, amount_fiat, amount_xlm, status, reference, tx_hash, asset, created_at
                FROM transactions WHERE user_id = ${id}
                ORDER BY created_at DESC LIMIT 20
            `,
            sql`
                SELECT id, alert_type, severity, message, resolved, created_at
                FROM compliance_alerts WHERE user_id = ${id}
                ORDER BY created_at DESC LIMIT 10
            `,
            sql`
                SELECT COUNT(*)::int AS c FROM merchant_checkouts WHERE merchant_user_id = ${id}
            `,
        ]);

        const apiKeys = await sql`
            SELECT id, name, key_prefix, last_used_at, revoked_at, created_at
            FROM merchant_api_keys WHERE user_id = ${id}
            ORDER BY created_at DESC LIMIT 10
        `;

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email ?? '—',
                phone: user.phone_number ?? '—',
                role: user.role || 'user',
                createdAt: user.created_at,
                wallet: user.wallet_public,
                countryCode: user.country_code ?? 'ZM',
                kycTier: user.kyc_tier ?? 'basic',
                suspended: !!user.suspended,
                suspendedReason: user.suspended_reason,
            },
            transactions: (txRows as Record<string, unknown>[]).map((t) => ({
                id: t.id,
                type: t.type,
                asset: t.asset || 'xlm',
                amountFiat: t.amount_fiat,
                amountXlm: t.amount_xlm,
                status: t.status,
                reference: t.reference,
                txHash: t.tx_hash,
                createdAt: t.created_at,
            })),
            alerts: alertRows,
            merchant: {
                checkoutCount: (checkoutCount[0] as { c: number }).c,
                apiKeys: (apiKeys as Record<string, unknown>[]).map((k) => ({
                    id: k.id,
                    name: k.name,
                    keyPrefix: k.key_prefix,
                    lastUsedAt: k.last_used_at,
                    revoked: !!k.revoked_at,
                    createdAt: k.created_at,
                })),
            },
        });
    } catch (err) {
        console.error('Admin user detail:', err);
        return NextResponse.json({ error: 'Failed to load user' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const ctx = await getAdminContext(request);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    try {
        if (body.action === 'retry_stuck') {
            if (!canRunOps(ctx.role)) {
                return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
            }
            const results = await tryCompleteUserStuckOps(id);
            await logAdminAction({
                adminUserId: ctx.userId,
                action: 'user.retry_stuck',
                targetType: 'user',
                targetId: id,
                details: { results },
                ip: ctx.ip,
            });
            return NextResponse.json({ ok: true, results });
        }

        if (!canManageUsers(ctx.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        if (body.action === 'suspend') {
            const reason = String(body.reason || 'Suspended by admin').slice(0, 500);
            await sql`
                UPDATE users
                SET suspended = true, suspended_reason = ${reason},
                    session_token_version = session_token_version + 1, updated_at = NOW()
                WHERE id = ${id}
            `;
            await logAdminAction({
                adminUserId: ctx.userId,
                action: 'user.suspend',
                targetType: 'user',
                targetId: id,
                details: { reason },
                ip: ctx.ip,
            });
            return NextResponse.json({ ok: true });
        }

        if (body.action === 'unsuspend') {
            await sql`
                UPDATE users SET suspended = false, suspended_reason = NULL, updated_at = NOW()
                WHERE id = ${id}
            `;
            await logAdminAction({
                adminUserId: ctx.userId,
                action: 'user.unsuspend',
                targetType: 'user',
                targetId: id,
                ip: ctx.ip,
            });
            return NextResponse.json({ ok: true });
        }

        if (body.action === 'set_kyc_tier') {
            const tier = String(body.kycTier || 'basic');
            if (!['basic', 'verified', 'enhanced'].includes(tier)) {
                return NextResponse.json({ error: 'Invalid KYC tier' }, { status: 400 });
            }
            await sql`UPDATE users SET kyc_tier = ${tier}, updated_at = NOW() WHERE id = ${id}`;
            await logAdminAction({
                adminUserId: ctx.userId,
                action: 'user.set_kyc_tier',
                targetType: 'user',
                targetId: id,
                details: { kycTier: tier },
                ip: ctx.ip,
            });
            return NextResponse.json({ ok: true });
        }

        if (body.action === 'force_logout') {
            await sql`
                UPDATE users SET session_token_version = session_token_version + 1, updated_at = NOW()
                WHERE id = ${id}
            `;
            await logAdminAction({
                adminUserId: ctx.userId,
                action: 'user.force_logout',
                targetType: 'user',
                targetId: id,
                ip: ctx.ip,
            });
            return NextResponse.json({ ok: true });
        }

        if (body.action === 'set_role' && ctx.role === 'admin') {
            const role = String(body.role || 'user');
            const allowed = ['user', 'admin_support', 'admin_ops', 'admin'];
            if (!allowed.includes(role)) {
                return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
            }
            await sql`UPDATE users SET role = ${role}, updated_at = NOW() WHERE id = ${id}`;
            await logAdminAction({
                adminUserId: ctx.userId,
                action: 'user.set_role',
                targetType: 'user',
                targetId: id,
                details: { role },
                ip: ctx.ip,
            });
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (err) {
        console.error('Admin user action:', err);
        return NextResponse.json({ error: 'Action failed' }, { status: 500 });
    }
}
