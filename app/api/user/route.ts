import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { StellarService } from '@/lib/stellar';
import { getRates } from '@/lib/rates';
import { getUserIdFromRequest } from '@/lib/auth';
import { getTierLimits } from '@/lib/kyc-tiers';
import { getMarket, marketToJson, resolveCountryCode } from '@/lib/markets';

export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRows = await sql`
            SELECT id, email, phone_number, preferred_operator, full_name, address,
                   id_document_type, id_document_number, wallet_public,
                   wallet_secret, wallet_secret_enc, country_code, role, suspended
            FROM users WHERE id = ${userId} LIMIT 1
        `;
        const user = userRows[0] as Record<string, unknown> | undefined;

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.suspended) {
            return NextResponse.json({ error: 'Account suspended. Contact support.' }, { status: 403 });
        }

        const [txRows, balanceResult] = await Promise.all([
            sql`
                SELECT * FROM transactions
                WHERE user_id = ${userId}
                ORDER BY created_at DESC
                LIMIT 10
            `,
            Promise.all([
                StellarService.getBalance(String(user.wallet_public)),
                StellarService.getUSDCBalance(String(user.wallet_public)),
                getRates(),
            ])
                .then(([xlm, usdc, rates]) => ({ xlm, usdc, rates }))
                .catch((err) => {
                    console.error('Balance/rates fetch error:', err);
                    return { xlm: '0', usdc: '0', rates: { xlm_sell: 3.5, usdc_sell: 25 } };
                }),
        ]);

        const { xlm: xlmBalance, usdc: usdcBalance, rates } = balanceResult;

        const transactionsForFrontend = (txRows as Record<string, unknown>[]).map((tx) => ({
            id: tx.id,
            type: tx.type,
            asset: tx.asset || 'xlm',
            amountFiat: tx.amount_fiat,
            amountXLM: tx.amount_xlm,
            status: tx.status,
            reference: tx.reference,
            txHash: tx.tx_hash,
            createdAt: tx.created_at,
            depositMemo: tx.deposit_memo,
        }));

        const fullName = String(user.full_name ?? '').trim();
        const phone = String(user.phone_number ?? '').trim();
        const address = String(user.address ?? '').trim();
        const idDocNumber = String(user.id_document_number ?? '').trim();
        const isProfileComplete = !!(fullName && phone.length >= 10 && address && idDocNumber);
        const tierLimits = await getTierLimits(userId);
        const usdcNum = Number(usdcBalance);
        const xlmNum = Number(xlmBalance);

        const walletCustody =
            user.wallet_secret_enc || (user.wallet_secret && String(user.wallet_secret).trim())
                ? ('hosted' as const)
                : ('self' as const);
        const countryCode = resolveCountryCode(user.country_code as string | undefined);
        const market = getMarket(countryCode);
        const fiatTotal = (xlmNum * rates.xlm_sell + usdcNum * rates.usdc_sell).toFixed(2);

        return NextResponse.json({
            user: {
                email: user.email,
                phone: user.phone_number,
                phone_number: user.phone_number,
                preferred_operator: user.preferred_operator,
                fullName: user.full_name,
                address: user.address,
                idDocumentType: user.id_document_type,
                idDocumentNumber: user.id_document_number,
                walletPublic: user.wallet_public,
                walletCustody,
                countryCode: market.countryCode,
                currency: market.currency,
                market: marketToJson(market),
                role: (user.role as string) || 'user',
                isProfileComplete,
                kycTier: tierLimits.tier,
            },
            balance: {
                xlm: xlmBalance,
                usdc: usdcBalance,
                xlmLocalEquiv: (xlmNum * rates.xlm_sell).toFixed(2),
                usdcLocalEquiv: (usdcNum * rates.usdc_sell).toFixed(2),
                xlmZmwEquiv: (xlmNum * rates.xlm_sell).toFixed(2),
                usdcZmwEquiv: (usdcNum * rates.usdc_sell).toFixed(2),
                usdPrimary: usdcNum.toFixed(2),
                fiatTotal,
                zmwTotal: fiatTotal,
            },
            tierLimits,
            transactions: transactionsForFrontend,
        });
    } catch (error) {
        console.error('User API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }
}
