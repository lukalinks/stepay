import { randomBytes } from 'crypto';
import { sql } from '@/lib/db';
import { LencoService } from '@/lib/lenco';
import { StellarService } from '@/lib/stellar';
import { parseStellarError } from '@/lib/stellar-error';
import { getPlatformWalletSecret } from '@/lib/platform-signer';
import { getUserWalletSecret } from '@/lib/signer';
import { completeBuyTransaction, failBuyTransaction } from '@/lib/deposit-claim';
import { cryptoToZmwForBuy, getFees, getLimits, getRates } from '@/lib/rates';
import { getCheckoutByToken, markCheckoutPaid } from '@/lib/merchant-checkouts';
import { deliverCheckoutWebhook } from '@/lib/merchant-webhooks';
import { formatPhoneE164ForMarket, isValidPhoneForMarket } from '@/lib/phone';
import { getMarket, marketSupportsPayment, resolveCountryCode, type MobileOperatorId } from '@/lib/markets';
import { sendPushNotification } from '@/lib/push';

export async function quoteCheckoutMobileMoney(
    amountUsdc: number,
    countryCode?: string | null
): Promise<{ zmwAmount: number; currency: string; countryCode: string } | null> {
    const market = getMarket(countryCode);
    if (!marketSupportsPayment(market.countryCode, 'mobile_money')) return null;

    const [rates, fees, limits] = await Promise.all([getRates(), getFees(), getLimits()]);
    let zmwAmount = cryptoToZmwForBuy(amountUsdc, 'usdc', rates, fees);
    zmwAmount = Math.ceil(zmwAmount * 100) / 100;
    if (zmwAmount < limits.min_deposit_zmw) zmwAmount = limits.min_deposit_zmw;
    if (zmwAmount > limits.max_deposit_zmw) return null;

    return { zmwAmount, currency: market.currency, countryCode: market.countryCode };
}

export async function startCheckoutMobileMoneyPayment(
    checkoutToken: string,
    input: { phone: string; operator: MobileOperatorId; countryCode?: string }
): Promise<{ reference: string; zmwAmount: number; message: string }> {
    const checkout = await getCheckoutByToken(checkoutToken);
    if (!checkout) throw new Error('Checkout not found or expired.');
    if (checkout.status !== 'pending') throw new Error('This payment link is no longer active.');
    if (checkout.asset !== 'usdc') throw new Error('Mobile money checkout is available for USDC links only.');

    const countryCode = resolveCountryCode(input.countryCode);
    const market = getMarket(countryCode);
    if (!marketSupportsPayment(market.countryCode, 'mobile_money')) {
        throw new Error('Mobile money is not available in this country yet.');
    }

    const phone = formatPhoneE164ForMarket(input.phone, market.countryCode);
    if (!isValidPhoneForMarket(phone, market.countryCode)) {
        throw new Error('Enter a valid mobile money number.');
    }

    const amountUsdc = Number(checkout.amount);
    const quote = await quoteCheckoutMobileMoney(amountUsdc, market.countryCode);
    if (!quote) throw new Error('Amount exceeds mobile money limits for this checkout.');

    const merchantUserId = String(checkout.merchant_user_id);
    const reference = `REF-${randomBytes(12).toString('hex')}`;

    const pending = await sql`
        SELECT id FROM transactions
        WHERE deposit_memo = ${checkoutToken} AND type = 'CHECKOUT_MM' AND status = 'PENDING'
        LIMIT 1
    `;
    if (pending[0]) {
        throw new Error('A mobile money payment is already pending for this link. Approve it on your phone or wait a few minutes.');
    }

    const txRows = await sql`
        INSERT INTO transactions (user_id, type, amount_fiat, amount_xlm, status, reference, asset, deposit_memo)
        VALUES (
            ${merchantUserId},
            'CHECKOUT_MM',
            ${quote.zmwAmount},
            ${amountUsdc},
            'PENDING',
            ${reference},
            'usdc',
            ${checkoutToken}
        )
        RETURNING id
    `;
    if (!txRows[0]) throw new Error('Could not start payment.');

    try {
        await LencoService.createCollection({
            amount: quote.zmwAmount,
            phone,
            operator: input.operator,
            reference,
            country: market.lencoCountryCode,
            currency: market.currency,
        });
    } catch (err) {
        await sql`DELETE FROM transactions WHERE reference = ${reference} AND status = 'PENDING'`;
        const msg = err instanceof Error ? err.message : 'Mobile money collection failed';
        throw new Error(msg);
    }

    return {
        reference,
        zmwAmount: quote.zmwAmount,
        message: `Check your phone to approve ${quote.zmwAmount.toFixed(2)} ${market.currency}. The merchant receives ${amountUsdc} USDC once paid.`,
    };
}

/** Credit merchant USDC after guest mobile money collection succeeds. */
export async function creditCheckoutMobileMoney(
    tx: Record<string, unknown>,
    reference: string
): Promise<{ ok: true; txHash: string } | { ok: false; reason: 'waiting_trustline' | 'failed'; error?: string }> {
    const checkoutToken = String(tx.deposit_memo ?? '');
    const checkout = checkoutToken ? await getCheckoutByToken(checkoutToken) : null;
    if (!checkout || checkout.status !== 'pending') {
        await failBuyTransaction(String(tx.id));
        return { ok: false, reason: 'failed', error: 'Checkout not found or already paid.' };
    }

    const merchantUserId = String(tx.user_id);
    const merchantRows = await sql`SELECT wallet_public, push_token FROM users WHERE id = ${merchantUserId} LIMIT 1`;
    const merchant = merchantRows[0] as { wallet_public?: string; push_token?: string | null } | undefined;
    const walletPublic = String(merchant?.wallet_public ?? '').trim();
    if (!walletPublic) {
        await failBuyTransaction(String(tx.id));
        return { ok: false, reason: 'failed', error: 'Merchant wallet not found.' };
    }

    const amountUsdc = Number(tx.amount_xlm).toFixed(7);
    const platformSecret = getPlatformWalletSecret();

    try {
        let walletSecret: string | null = null;
        try {
            walletSecret = await getUserWalletSecret(merchantUserId);
        } catch {
            walletSecret = null;
        }

        await StellarService.ensureXlmForUsdcTrustline(platformSecret, walletPublic);
        if (walletSecret) {
            await StellarService.ensureUSDCTrustline(walletSecret);
        } else {
            const hasTrust = await StellarService.hasUSDCTrustline(walletPublic);
            if (!hasTrust) {
                if (merchant?.push_token) {
                    sendPushNotification(
                        merchant.push_token,
                        'Enable USDC',
                        'Unlock your wallet in Stepay to receive this payment.',
                        { type: 'checkout', asset: 'usdc' }
                    ).catch(() => {});
                }
                return { ok: false, reason: 'waiting_trustline' };
            }
        }

        const txHash = await StellarService.sendUSDC(platformSecret, walletPublic, amountUsdc);
        await completeBuyTransaction(String(tx.id), txHash);

        const paid = await markCheckoutPaid(String(checkout.id), null, txHash);
        if (paid) {
            deliverCheckoutWebhook(paid, null, txHash).catch((err) =>
                console.error('Checkout webhook error:', err)
            );
            if (merchant?.push_token) {
                sendPushNotification(
                    merchant.push_token,
                    'Payment received',
                    `${amountUsdc} USDC from mobile money — ${checkout.label}`,
                    { type: 'checkout_paid', checkoutId: checkout.id }
                ).catch(() => {});
            }
        }

        console.log(`creditCheckoutMobileMoney: ${reference} → ${txHash}`);
        return { ok: true, txHash };
    } catch (err) {
        await failBuyTransaction(String(tx.id));
        return { ok: false, reason: 'failed', error: parseStellarError(err) };
    }
}
