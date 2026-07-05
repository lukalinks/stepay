import { NextResponse } from 'next/server';
import { z } from 'zod';
import { startCheckoutMobileMoneyPayment } from '@/lib/checkout-mobile-money';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { clientIp } from '@/lib/signer';

const schema = z.object({
    phone: z.string().min(9),
    operator: z.enum(['mtn', 'airtel', 'zamtel']).default('mtn'),
    countryCode: z.string().length(2).optional(),
});

export async function POST(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;
        const ip = clientIp(request) || 'unknown';

        await assertRateLimit(rateLimitKey('checkout-mm-ip', [ip]), 15, 15 * 60 * 1000);
        await assertRateLimit(rateLimitKey('checkout-mm-token', [token]), 5, 15 * 60 * 1000);

        const body = schema.parse(await request.json());
        const result = await startCheckoutMobileMoneyPayment(token, body);
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status, headers: { 'Retry-After': String(r.retryAfterSec) } });
        }
        const message = err instanceof Error ? err.message : 'Could not start mobile money payment';
        const status = message.includes('not found') || message.includes('expired') ? 404 : 400;
        console.error('Checkout mobile money POST:', err);
        return NextResponse.json({ error: message }, { status });
    }
}
