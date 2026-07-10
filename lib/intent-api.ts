import { deliverConfirmCode } from '@/lib/confirm-delivery';
import type { ConfirmAction } from '@/lib/email';
import { assertTierLimitsForUser, prepareOutboundRequest } from '@/lib/security-guards';
import { createSignIntent, type SignIntentType } from '@/lib/sign-intents';

export async function createOutboundIntent(
    userId: string,
    type: SignIntentType,
    payload: Record<string, unknown>,
    action: ConfirmAction
) {
    const prep = await prepareOutboundRequest(userId);

    if (type === 'SEND') {
        const p = payload as { amount: number; asset: 'xlm' | 'usdc' };
        await assertTierLimitsForUser(userId, Number(p.amount), p.asset === 'usdc' ? 'usdc' : 'xlm', 'send');
    } else if (type === 'SELL') {
        const p = payload as { amount: number; asset: 'xlm' | 'usdc' };
        await assertTierLimitsForUser(userId, Number(p.amount), p.asset === 'usdc' ? 'usdc' : 'xlm', 'sell');
    } else if (type === 'SWAP') {
        const p = payload as { amount: number; from: 'xlm' | 'usdc' };
        await assertTierLimitsForUser(userId, Number(p.amount), p.from, 'swap');
    }

    const { intentId, expiresAt, confirmCode } = await createSignIntent(userId, type, payload);
    const { delivery, maskedEmail } = await deliverConfirmCode(prep.email, confirmCode, action);

    return {
        intentId,
        expiresAt,
        codeDelivery: delivery,
        maskedEmail,
        ...(delivery === 'dev' ? { devConfirmCode: confirmCode } : {}),
    };
}
