import { randomBytes } from 'crypto';
import { sql } from '@/lib/db';
import { normalizeZambianPhone } from '@/lib/phone';
import { notifyMoneyRequest } from '@/lib/notifications';
import { whatsAppShareUrl } from '@/lib/share';

const REQUEST_TTL_DAYS = 7;

export async function createMoneyRequest(opts: {
    requesterId: string;
    amount: number;
    asset: 'xlm' | 'usdc';
    payerPhone?: string;
    note?: string;
}): Promise<{ payToken: string; payUrl: string; whatsAppUrl: string }> {
    const payToken = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + REQUEST_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const payerNorm = opts.payerPhone ? normalizeZambianPhone(opts.payerPhone) : null;

    await sql`
        INSERT INTO money_requests (
            requester_id, payer_phone_normalized, amount, asset, note, pay_token, expires_at
        )
        VALUES (
            ${opts.requesterId},
            ${payerNorm},
            ${opts.amount},
            ${opts.asset},
            ${opts.note ?? null},
            ${payToken},
            ${expiresAt}
        )
    `;

    const origin = process.env.AUTH_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    const payUrl = `${origin}/pay/request/${payToken}`;

    const requesterRows = await sql`SELECT full_name FROM users WHERE id = ${opts.requesterId} LIMIT 1`;
    const requesterName = (requesterRows[0] as { full_name?: string | null } | undefined)?.full_name ?? 'Someone';

    await notifyMoneyRequest({
        payerPhone: opts.payerPhone,
        requesterName: String(requesterName),
        amount: opts.amount,
        asset: opts.asset,
        payUrl,
    });

    const whatsAppUrl = whatsAppShareUrl(
        `${requesterName} requested ${opts.amount} ${opts.asset.toUpperCase()} on Stepay: ${payUrl}`
    );

    return { payToken, payUrl, whatsAppUrl };
}

export async function getMoneyRequestByToken(token: string) {
    const rows = await sql`
        SELECT r.*, u.full_name AS requester_name, u.phone_number AS requester_phone
        FROM money_requests r
        JOIN users u ON u.id = r.requester_id
        WHERE r.pay_token = ${token}
        LIMIT 1
    `;
    return (rows[0] as Record<string, unknown> | undefined) ?? null;
}

export async function markMoneyRequestPaid(token: string, payerId: string, txHash: string): Promise<void> {
    await sql`
        UPDATE money_requests
        SET status = 'paid', payer_id = ${payerId}, paid_at = NOW(), send_tx_hash = ${txHash}
        WHERE pay_token = ${token} AND status = 'pending'
    `;
}

export async function listMoneyRequestsForUser(userId: string) {
    const rows = await sql`
        SELECT id, amount, asset, note, status, pay_token, expires_at, created_at
        FROM money_requests
        WHERE requester_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 20
    `;
    return rows;
}
