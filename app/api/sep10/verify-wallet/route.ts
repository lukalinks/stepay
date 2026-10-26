import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { verifySep10Token } from '@/lib/sep10';

/**
 * Logged-in user proves device wallet ownership via a SEP-10 token.
 * Confirms the signed account matches the user's registered wallet_public.
 */
export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const token = typeof body.token === 'string' ? body.token.trim() : '';
        if (!token) {
            return NextResponse.json({ error: 'token required' }, { status: 400 });
        }

        const verified = verifySep10Token(token);
        if (!verified) {
            return NextResponse.json({ error: 'Invalid or expired SEP-10 token' }, { status: 400 });
        }

        const rows = await sql`
            SELECT wallet_public FROM users WHERE id = ${userId} LIMIT 1
        `;
        const walletPublic = String((rows[0] as { wallet_public?: string } | undefined)?.wallet_public || '');
        if (!walletPublic) {
            return NextResponse.json({ error: 'No wallet on this account' }, { status: 400 });
        }

        const matches = walletPublic.toUpperCase() === verified.account.toUpperCase();
        return NextResponse.json({
            ok: matches,
            account: verified.account,
            walletPublic,
            matches,
            message: matches
                ? 'Wallet ownership verified with SEP-10.'
                : 'Signed account does not match your Stepay wallet.',
        });
    } catch (err) {
        console.error('SEP-10 verify-wallet:', err);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}
