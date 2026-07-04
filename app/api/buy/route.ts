import { NextResponse } from 'next/server';
import { LencoService } from '@/lib/lenco';
import { sql } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { z } from 'zod';
import { getRates, getFees, getLimits, zmwToCrypto } from '@/lib/rates';
import { randomBytes } from 'crypto';
import { formatPhoneE164ForMarket, isValidPhoneForMarket } from '@/lib/phone';
import { formatLocalCurrencyCode, marketSupportsPayment } from '@/lib/markets';
import { getUserMarket } from '@/lib/user-market';
import { saveDepositPhoneDetails } from '@/lib/user-phone';
import { StellarService } from '@/lib/stellar';

const schema = z.object({
    amount: z.coerce.number().min(1),
    phone: z.string().min(9),
    operator: z.enum(['mtn', 'airtel', 'zamtel']).default('mtn'),
    asset: z.enum(['xlm', 'usdc']).default('xlm'),
});

function parseBuyBody(body: unknown, countryCode: string) {
    const parsed = schema.parse(body);
    if (!isValidPhoneForMarket(parsed.phone, countryCode)) {
        throw new z.ZodError([
            {
                code: 'custom',
                message: 'Enter a valid mobile money number for your country.',
                path: ['phone'],
            },
        ]);
    }
    return {
        ...parsed,
        phone: formatPhoneE164ForMarket(parsed.phone, countryCode),
    };
}

export async function GET() {
    return NextResponse.json({ message: 'Use POST to create a deposit. See docs for payload.' });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const userId = await getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const market = await getUserMarket(userId);
        if (!marketSupportsPayment(market.countryCode, 'mobile_money')) {
            return NextResponse.json(
                { success: false, error: 'Mobile money deposits are not available in your country yet.' },
                { status: 400 }
            );
        }

        const { amount, phone, operator, asset } = parseBuyBody(body, market.countryCode);

        const userRows = await sql`
            SELECT * FROM users WHERE id = ${userId} LIMIT 1
        `;
        const user = userRows[0];
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const [rates, fees, limits] = await Promise.all([getRates(), getFees(), getLimits()]);
        const amountCrypto = zmwToCrypto(amount, asset, rates, fees);
        const minFiat = limits.min_deposit_zmw;
        const maxFiat = limits.max_deposit_zmw;
        if (amount < minFiat) {
            return NextResponse.json({
                success: false,
                error: `Minimum ${formatLocalCurrencyCode(minFiat, market.countryCode)} required per deposit.`,
            }, { status: 400 });
        }
        if (amount > maxFiat) {
            return NextResponse.json({
                success: false,
                error: `Maximum ${formatLocalCurrencyCode(maxFiat, market.countryCode)} per deposit.`,
            }, { status: 400 });
        }

        const walletPublic = String(user.wallet_public ?? '').trim();
        if (!walletPublic) {
            return NextResponse.json({ success: false, error: 'Wallet not found. Sign out and sign in again.' }, { status: 400 });
        }

        const accountExists = await StellarService.accountExists(walletPublic);
        if (!accountExists && asset === 'xlm' && amountCrypto < 1) {
            return NextResponse.json({
                success: false,
                error: `Your first deposit must buy at least 1 XLM (about ${formatLocalCurrencyCode(Math.ceil(rates.xlm_buy), market.countryCode)}).`,
            }, { status: 400 });
        }
        if (!accountExists && asset === 'usdc') {
            // Allowed — credit flow creates the Stellar account with minimum XLM reserve first.
        }

        const reference = `REF-${randomBytes(12).toString('hex')}`;

        const txRows = await sql`
            INSERT INTO transactions (user_id, type, amount_fiat, amount_xlm, status, reference, asset)
            VALUES (
                ${userId},
                'BUY',
                ${amount},
                ${amountCrypto},
                'PENDING',
                ${reference},
                ${asset}
            )
            RETURNING *
        `;
        const transaction = txRows[0];
        if (!transaction) {
            throw new Error('Failed to create transaction');
        }

        try {
            await LencoService.createCollection({
                amount,
                phone,
                operator: operator ?? 'mtn',
                reference,
                country: market.lencoCountryCode,
                currency: market.currency,
            });
        } catch (lencoError: unknown) {
            const msg =
                lencoError && typeof lencoError === 'object' && 'message' in lencoError
                    ? String((lencoError as { message?: string }).message)
                    : 'Mobile money collection failed';
            console.error('Buy Lenco error:', msg);
            await sql`DELETE FROM transactions WHERE id = ${transaction.id}`;
            return NextResponse.json({ success: false, error: msg, code: 'lenco_error' }, { status: 400 });
        }

        await saveDepositPhoneDetails(userId, phone, operator ?? 'mtn', market.countryCode).catch((err) => {
            console.warn('Buy: could not save deposit phone on profile', err);
        });

        return NextResponse.json({
            success: true,
            reference,
            message: `Payment request sent! Check your phone to approve. ${asset.toUpperCase()} will be sent once payment is confirmed.`,
        });
    } catch (error: unknown) {
        console.error('Buy API Error:', error);
        let message = 'Failed to process buy request';
        if (error && typeof error === 'object' && (error as { name?: string }).name === 'ZodError') {
            const zerr = error as { issues?: { path?: unknown[] }[] };
            const first = zerr.issues?.[0];
            const path = first?.path?.[0];
            if (path === 'amount') message = 'Please enter a valid deposit amount';
            else if (path === 'phone') message = 'Please enter a valid mobile money number (at least 10 digits)';
            else if (path === 'operator') message = 'Please select your mobile money provider';
        } else if (error instanceof Error) {
            message = error.message;
        }
        const status =
            error && typeof error === 'object' && (error as { name?: string }).name === 'ZodError' ? 400 : 500;
        return NextResponse.json({ success: false, error: message }, { status });
    }
}
