import { NextResponse } from 'next/server';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { clientIp } from '@/lib/signer';
import { isPublicLaunch, joinWaitlist } from '@/lib/access-control';

export async function POST(request: Request) {
    try {
        if (await isPublicLaunch()) {
            return NextResponse.json(
                { error: 'Stepay is open — you can create an account now.', publicLaunch: true },
                { status: 400 }
            );
        }

        const body = await request.json().catch(() => ({}));
        const email = typeof body.email === 'string' ? body.email.trim() : '';
        if (!email.includes('@')) {
            return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
        }

        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('waitlist', [ip]), 20, 60 * 60 * 1000);
        await assertRateLimit(rateLimitKey('waitlist-email', [email.toLowerCase()]), 5, 60 * 60 * 1000);

        const result = await joinWaitlist(email);
        if (result.pendingInvite) {
            return NextResponse.json({
                success: true,
                created: false,
                pendingInvite: true,
                message:
                    'This email already has an invite. Check your inbox for the invite link, or continue signup with this email on the create-account form.',
            });
        }
        return NextResponse.json({
            success: true,
            created: result.created,
            message:
                "Stepay is not publicly launched yet. You're on the list — we'll email you when it's available.",
        });
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json(
                { error: r.error },
                { status: r.status, headers: { 'Retry-After': String(r.retryAfterSec) } }
            );
        }
        const msg = err instanceof Error ? err.message : 'Could not join waitlist';
        const status = msg.includes('already exists') || msg.includes('valid') ? 400 : 500;
        if (status === 500) console.error('Waitlist POST:', err);
        return NextResponse.json({ error: msg }, { status });
    }
}
