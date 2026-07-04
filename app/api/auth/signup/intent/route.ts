import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { deliverConfirmCode } from '@/lib/confirm-delivery';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { clientIp } from '@/lib/signer';
import { createSignupVerification } from '@/lib/signup-verify';
import { isSupportedCountry, resolveCountryCode } from '@/lib/markets';

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const email = typeof body.email === 'string' ? body.email.trim() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const countryCodeRaw = body.countryCode;

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
        }
        if (!password || password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        const countryCode =
            typeof countryCodeRaw === 'string' && isSupportedCountry(countryCodeRaw)
                ? countryCodeRaw.trim().toUpperCase()
                : resolveCountryCode(null);

        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('signup-intent', [ip]), 10, 60 * 60 * 1000);
        await assertRateLimit(rateLimitKey('signup-intent-email', [email.toLowerCase()]), 5, 60 * 60 * 1000);

        const existing = await sql`
            SELECT id FROM users WHERE lower(trim(email)) = lower(${email}) LIMIT 1
        `;
        if (existing.length) {
            return NextResponse.json(
                { error: 'An account with this email already exists. Try signing in.' },
                { status: 400 }
            );
        }

        const { signupId, confirmCode } = await createSignupVerification(email, password, countryCode);
        const { delivery, maskedEmail } = await deliverConfirmCode(email, confirmCode, 'signup');

        return NextResponse.json({
            success: true,
            signupId,
            codeDelivery: delivery,
            maskedEmail,
            ...(delivery === 'dev' ? { devConfirmCode: confirmCode } : {}),
        });
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status, headers: { 'Retry-After': String(r.retryAfterSec) } });
        }
        const msg = err instanceof Error ? err.message : 'Could not start signup';
        console.error('Signup intent error:', err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
