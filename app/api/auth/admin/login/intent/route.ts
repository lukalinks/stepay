import { NextResponse } from 'next/server';
import { adminLoginEmail, createAdminLoginVerification } from '@/lib/admin-login';
import { deliverConfirmCode } from '@/lib/confirm-delivery';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { clientIp } from '@/lib/signer';

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const email = typeof body.email === 'string' ? body.email.trim() : adminLoginEmail();

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
        }

        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('admin-login-intent', [ip]), 10, 60 * 60 * 1000);
        await assertRateLimit(rateLimitKey('admin-login-intent-email', [email.toLowerCase()]), 5, 60 * 60 * 1000);

        const result = await createAdminLoginVerification(email);
        if (!result) {
            return NextResponse.json(
                { error: 'If this admin account exists, a verification code will be sent.' },
                { status: 400 }
            );
        }

        const { loginId, confirmCode } = result;
        const { delivery, maskedEmail } = await deliverConfirmCode(email, confirmCode, 'admin-login');

        return NextResponse.json({
            success: true,
            loginId,
            codeDelivery: delivery,
            maskedEmail,
            ...(delivery === 'dev' ? { devConfirmCode: confirmCode } : {}),
        });
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status, headers: { 'Retry-After': String(r.retryAfterSec) } });
        }
        const msg = err instanceof Error ? err.message : 'Could not start admin login';
        console.error('Admin login intent error:', err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
