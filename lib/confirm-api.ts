import { assertConfirmAttemptLimit } from '@/lib/security-guards';
import { assertRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { clientIp } from '@/lib/signer';

export async function guardConfirmRequest(userId: string, request?: Request): Promise<void> {
    await assertConfirmAttemptLimit(userId);
    if (request) {
        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('confirm-ip', [ip]), 40, 60 * 60 * 1000);
    }
    await assertRateLimit(rateLimitKey('confirm-user', [userId]), 30, 60 * 60 * 1000);
}
