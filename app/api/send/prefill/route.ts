import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { sql } from '@/lib/db';
import { getCheckoutByToken } from '@/lib/merchant-checkouts';
import { getPayLinkBySlug } from '@/lib/pay-links';
import { getMoneyRequestByToken } from '@/lib/money-requests';

export async function GET(request: Request) {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const checkout = searchParams.get('checkout');
    const pay = searchParams.get('pay');
    const requestToken = searchParams.get('request');

    try {
        if (checkout) {
            const row = await getCheckoutByToken(checkout);
            if (!row || row.status !== 'pending') {
                return NextResponse.json({ error: 'Checkout not available' }, { status: 404 });
            }
            if (String(row.merchant_user_id) === userId) {
                return NextResponse.json({ error: 'You cannot pay your own checkout' }, { status: 400 });
            }
            return NextResponse.json({
                kind: 'checkout',
                mode: 'address',
                to: row.merchant_wallet,
                amount: Number(row.amount),
                asset: row.asset === 'xlm' ? 'xlm' : 'usdc',
                memo: String(row.label).slice(0, 28),
                checkoutToken: checkout,
                merchantName: row.merchant_name,
                label: row.label,
                locked: true,
            });
        }

        if (pay) {
            const link = await getPayLinkBySlug(pay);
            if (!link) {
                return NextResponse.json({ error: 'Pay link not found' }, { status: 404 });
            }
            if (String(link.user_id) === userId) {
                return NextResponse.json({ error: 'You cannot pay yourself' }, { status: 400 });
            }
            return NextResponse.json({
                kind: 'pay_link',
                mode: 'address',
                to: link.wallet_public,
                amount: link.amount != null ? Number(link.amount) : null,
                asset: link.asset === 'xlm' ? 'xlm' : 'usdc',
                memo: link.label ? String(link.label).slice(0, 28) : undefined,
                paySlug: pay,
                merchantName: link.full_name,
                label: link.label,
                locked: link.amount != null && Number(link.amount) > 0,
            });
        }

        if (requestToken) {
            const req = await getMoneyRequestByToken(requestToken);
            if (!req || req.status !== 'pending') {
                return NextResponse.json({ error: 'Request not found or already paid' }, { status: 404 });
            }
            if (String(req.requester_id) === userId) {
                return NextResponse.json({ error: 'You cannot pay your own request' }, { status: 400 });
            }
            const requesterRows = await sql`
                SELECT wallet_public FROM users WHERE id = ${String(req.requester_id)} LIMIT 1
            `;
            const wallet = (requesterRows[0] as { wallet_public?: string } | undefined)?.wallet_public;
            if (!wallet) {
                return NextResponse.json({ error: 'Requester wallet not found' }, { status: 400 });
            }
            return NextResponse.json({
                kind: 'money_request',
                mode: 'address',
                to: wallet,
                amount: Number(req.amount),
                asset: req.asset === 'xlm' ? 'xlm' : 'usdc',
                memo: req.note ? String(req.note).slice(0, 28) : 'Payment request',
                requestToken,
                merchantName: req.requester_name,
                label: req.note ?? 'Money request',
                locked: true,
            });
        }

        return NextResponse.json({ error: 'Missing checkout, pay, or request parameter' }, { status: 400 });
    } catch (err) {
        console.error('Send prefill:', err);
        return NextResponse.json({ error: 'Failed to load payment details' }, { status: 500 });
    }
}
