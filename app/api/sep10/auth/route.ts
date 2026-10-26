import { NextResponse } from 'next/server';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { clientIp } from '@/lib/signer';
import { buildSep10Challenge, issueSep10Token, verifySep10Challenge } from '@/lib/sep10';

/**
 * SEP-0010 Web Auth endpoint (WEB_AUTH_ENDPOINT).
 * GET  ?account=G... → challenge transaction
 * POST { transaction } → JWT token
 */
export async function GET(request: Request) {
    try {
        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('sep10-challenge', [ip]), 60, 60 * 60 * 1000);

        const { searchParams } = new URL(request.url);
        const account = searchParams.get('account')?.trim() || '';
        if (!account) {
            return NextResponse.json({ error: 'account required' }, { status: 400 });
        }

        const challenge = buildSep10Challenge(account);
        return NextResponse.json(challenge, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store',
            },
        });
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status });
        }
        const msg = err instanceof Error ? err.message : 'Challenge failed';
        const status = msg.includes('account') || msg.includes('configured') ? 400 : 500;
        if (status === 500) console.error('SEP-10 challenge:', err);
        return NextResponse.json({ error: msg }, { status });
    }
}

export async function POST(request: Request) {
    try {
        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('sep10-token', [ip]), 60, 60 * 60 * 1000);

        const body = await request.json().catch(() => ({}));
        const transaction =
            typeof body.transaction === 'string'
                ? body.transaction.trim()
                : typeof body.tx === 'string'
                  ? body.tx.trim()
                  : '';

        if (!transaction) {
            return NextResponse.json({ error: 'transaction required' }, { status: 400 });
        }

        const { account } = verifySep10Challenge(transaction);
        const token = issueSep10Token(account);
        return NextResponse.json(
            { token, account },
            {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-store',
                },
            }
        );
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status });
        }
        const msg = err instanceof Error ? err.message : 'Authentication failed';
        console.error('SEP-10 token:', msg);
        return NextResponse.json({ error: 'Invalid challenge transaction' }, { status: 400 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
