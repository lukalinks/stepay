import { sql } from '@/lib/db';
import { getLimits, getRates } from '@/lib/rates';
import type { SignIntentType } from '@/lib/sign-intents';
import { assertTierOutboundLimit } from '@/lib/kyc-tiers';

export async function assertProfileComplete(userId: string): Promise<void> {
    const rows = await sql`
        SELECT full_name, phone_number, address, id_document_number
        FROM users WHERE id = ${userId} LIMIT 1
    `;
    const u = rows[0] as Record<string, unknown> | undefined;
    if (!u) throw new Error('User not found');

    const fullName = String(u.full_name ?? '').trim();
    const phone = String(u.phone_number ?? '').trim();
    const address = String(u.address ?? '').trim();
    const idDoc = String(u.id_document_number ?? '').trim();

    if (!fullName || phone.length < 10 || !address || !idDoc) {
        throw new Error('Complete your profile before sending, swapping, or cashing out.');
    }
}

export async function assertIntentCreationLimit(userId: string, maxPerHour = 20): Promise<void> {
    const rows = await sql`
        SELECT COUNT(*)::int AS c FROM sign_intents
        WHERE user_id = ${userId} AND created_at >= NOW() - INTERVAL '1 hour'
    `;
    const count = Number((rows[0] as { c: number })?.c ?? 0);
    if (count >= maxPerHour) {
        throw new Error('Too many confirmation requests. Please wait before trying again.');
    }
}

export async function assertConfirmAttemptLimit(userId: string, maxPerHour = 30): Promise<void> {
    const rows = await sql`
        SELECT COALESCE(SUM(attempts), 0)::int AS c FROM sign_intents
        WHERE user_id = ${userId} AND created_at >= NOW() - INTERVAL '1 hour'
    `;
    const count = Number((rows[0] as { c: number })?.c ?? 0);
    if (count >= maxPerHour) {
        throw new Error('Too many confirmation attempts. Please wait before trying again.');
    }
}

export async function getUserEmail(userId: string): Promise<string> {
    const rows = await sql`SELECT email FROM users WHERE id = ${userId} LIMIT 1`;
    const email = (rows[0] as { email?: string | null } | undefined)?.email?.trim();
    if (!email) throw new Error('Add an email to your account to receive confirmation codes.');
    return email;
}

export type OutboundPrep = { email: string; codeDelivery: 'email' | 'dev' };

export async function prepareOutboundRequest(userId: string): Promise<OutboundPrep> {
    await assertProfileComplete(userId);
    await assertIntentCreationLimit(userId);
    const email = await getUserEmail(userId);
    return { email, codeDelivery: process.env.NODE_ENV === 'production' ? 'email' : 'dev' };
}

const TYPE_TO_ACTION = {
    SEND: 'send',
    SELL: 'sell',
    SWAP: 'swap',
} as const;

export function confirmActionFromIntentType(type: SignIntentType): 'send' | 'sell' | 'swap' {
    return TYPE_TO_ACTION[type];
}

/** Enforce platform max single outbound crypto amount (ZMW equivalent rough check). */
export async function assertSingleOutboundAmount(
    amount: number,
    asset: 'xlm' | 'usdc',
    kind: 'send' | 'sell' | 'swap'
): Promise<void> {
    const limits = await getLimits();
    const maxZmw = kind === 'sell' ? limits.max_withdraw_zmw : limits.max_deposit_zmw;
    const rates = await getRates();
    const rate = asset === 'usdc' ? rates.usdc_sell : rates.xlm_sell;
    const zmwApprox = amount * rate;
    if (zmwApprox > maxZmw * 1.05) {
        throw new Error(`Amount exceeds the maximum of ${maxZmw} ZMW per transaction.`);
    }
}

/** Tier-based limits (BoZ readiness) — call from intent creation with userId. */
export async function assertTierLimitsForUser(
    userId: string,
    amount: number,
    asset: 'xlm' | 'usdc',
    kind: 'send' | 'sell' | 'swap'
): Promise<void> {
    const rates = await getRates();
    const rate = asset === 'usdc' ? rates.usdc_sell : rates.xlm_sell;
    const zmwApprox = amount * rate;
    await assertTierOutboundLimit(userId, zmwApprox, kind);
    await assertSingleOutboundAmount(amount, asset, kind);
}
