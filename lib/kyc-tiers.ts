import { sql } from '@/lib/db';
import { getLimits } from '@/lib/rates';

export type KycTier = 'basic' | 'verified';

export type TierLimits = {
    tier: KycTier;
    maxSingleSendZmw: number;
    maxDailySendZmw: number;
    maxDepositZmw: number;
    maxWithdrawZmw: number;
    phonePayEnabled: boolean;
};

const VERIFIED_MULTIPLIER = 1;
const BASIC_MULTIPLIER = 0.25;

export async function getUserKycTier(userId: string): Promise<KycTier> {
    const rows = await sql`
        SELECT kyc_tier, full_name, phone_number, address, id_document_number
        FROM users WHERE id = ${userId} LIMIT 1
    `;
    const u = rows[0] as Record<string, unknown> | undefined;
    if (!u) return 'basic';

    const stored = String(u.kyc_tier ?? 'basic') as KycTier;
    const fullName = String(u.full_name ?? '').trim();
    const phone = String(u.phone_number ?? '').trim();
    const address = String(u.address ?? '').trim();
    const idDoc = String(u.id_document_number ?? '').trim();
    const profileComplete = !!(fullName && phone.length >= 10 && address && idDoc);

    if (profileComplete && stored !== 'verified') {
        await sql`UPDATE users SET kyc_tier = 'verified', updated_at = NOW() WHERE id = ${userId}`;
        return 'verified';
    }

    return profileComplete ? 'verified' : 'basic';
}

export async function getTierLimits(userId: string): Promise<TierLimits> {
    const tier = await getUserKycTier(userId);
    const limits = await getLimits();
    const mult = tier === 'verified' ? VERIFIED_MULTIPLIER : BASIC_MULTIPLIER;

    return {
        tier,
        maxSingleSendZmw: Math.max(50, Math.floor(limits.max_deposit_zmw * mult)),
        maxDailySendZmw: Math.max(200, Math.floor(limits.max_deposit_zmw * mult * 3)),
        maxDepositZmw: Math.max(50, Math.floor(limits.max_deposit_zmw * mult)),
        maxWithdrawZmw: Math.max(50, Math.floor(limits.max_withdraw_zmw * mult)),
        phonePayEnabled: true,
    };
}

export async function assertTierOutboundLimit(
    userId: string,
    amountZmw: number,
    kind: 'send' | 'sell' | 'swap'
): Promise<void> {
    const tierLimits = await getTierLimits(userId);
    const maxSingle = kind === 'sell' ? tierLimits.maxWithdrawZmw : tierLimits.maxSingleSendZmw;
    if (amountZmw > maxSingle * 1.05) {
        const tier = tierLimits.tier;
        if (tier === 'basic') {
            throw new Error(
                `Amount exceeds your ${maxSingle} ZMW limit. Complete your profile to unlock higher limits.`
            );
        }
        throw new Error(`Amount exceeds the maximum of ${maxSingle} ZMW per transaction for your account tier.`);
    }
}

export async function recordComplianceAlert(opts: {
    userId?: string | null;
    alertType: string;
    severity?: 'info' | 'warning' | 'critical';
    message: string;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    await sql`
        INSERT INTO compliance_alerts (user_id, alert_type, severity, message, metadata)
        VALUES (
            ${opts.userId ?? null},
            ${opts.alertType},
            ${opts.severity ?? 'info'},
            ${opts.message},
            ${opts.metadata ? JSON.stringify(opts.metadata) : null}::jsonb
        )
    `;
}
