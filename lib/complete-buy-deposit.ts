import { sql } from '@/lib/db';
import { LencoService } from '@/lib/lenco';
import { StellarService } from '@/lib/stellar';
import { parseStellarError } from '@/lib/stellar-error';
import { getUserWalletSecret } from '@/lib/signer';
import { getPlatformWalletSecret } from '@/lib/platform-signer';
import { sendPushNotification } from '@/lib/push';
import {
    claimPendingBuyTransaction,
    completeBuyTransaction,
    failBuyTransaction,
    failBuyTransactionByReference,
    findBuyTransactionByReference,
} from '@/lib/deposit-claim';
import { notifyDepositFailed, notifyDepositSuccess } from '@/lib/deposit-notify';

export type BuyDepositCompletionStatus =
    | 'completed'
    | 'pending'
    | 'failed'
    | 'waiting_trustline';

export async function isLencoDepositPaid(reference: string): Promise<boolean> {
    const collection = await LencoService.getCollectionByReference(reference);
    if (collection?.status === 'successful') return true;

    const lencoTx = await LencoService.getTransactionByReference(reference);
    return !!(lencoTx && lencoTx.status === 'successful' && lencoTx.type === 'credit');
}

async function loadUserForDeposit(userId: string) {
    const userRows = await sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`;
    return (userRows[0] as Record<string, unknown> | undefined) ?? null;
}

/** Send purchased crypto to the user's wallet after mobile money succeeds. */
export async function creditBuyDeposit(
    tx: Record<string, unknown>,
    reference: string
): Promise<
    | { ok: true; txHash: string }
    | { ok: false; reason: 'waiting_trustline' | 'failed'; error?: string }
> {
    const uid = String(tx.user_id);
    const user = await loadUserForDeposit(uid);

    if (!user) {
        console.warn('creditBuyDeposit: no user for', reference);
        await failBuyTransaction(String(tx.id));
        return { ok: false, reason: 'failed', error: 'User not found' };
    }

    const walletPublic = String(user.wallet_public ?? '').trim();
    if (!walletPublic) {
        console.error('creditBuyDeposit: missing wallet public key for', reference);
        const failed = await failBuyTransaction(String(tx.id));
        if (failed) {
            await notifyDepositFailed(tx, 'Your wallet could not be found. Please sign in again or contact support.', {
                user,
            });
        }
        return { ok: false, reason: 'failed', error: 'Wallet not found' };
    }

    try {
        const platformSecret = getPlatformWalletSecret();
        const asset = (tx.asset || 'xlm') as string;
        const amountStr = Number(tx.amount_xlm).toFixed(7);
        let txHash: string;

        if (asset === 'usdc') {
            let walletSecret: string | null = null;
            try {
                walletSecret = await getUserWalletSecret(uid);
            } catch {
                walletSecret = null;
            }

            await StellarService.ensureXlmForUsdcTrustline(platformSecret, walletPublic);

            if (walletSecret) {
                await StellarService.ensureUSDCTrustline(walletSecret);
            } else {
                const hasTrust = await StellarService.hasUSDCTrustline(walletPublic);
                if (!hasTrust) {
                    console.log(`creditBuyDeposit: USDC trustline missing for ${reference}`);
                    const pushToken = user.push_token as string | undefined;
                    if (pushToken) {
                        sendPushNotification(
                            pushToken,
                            'Enable USDC',
                            'Unlock your wallet in Stepay to receive your USDC deposit.',
                            { type: 'deposit', asset: 'usdc' }
                        ).catch(() => {});
                    }
                    return { ok: false, reason: 'waiting_trustline' };
                }
            }
            txHash = await StellarService.sendUSDC(platformSecret, walletPublic, amountStr);
        } else {
            const destExists = await StellarService.accountExists(walletPublic);
            if (!destExists && Number(amountStr) < 1) {
                const failed = await failBuyTransaction(String(tx.id));
                const minError =
                    'First XLM deposit must be at least 1 XLM (~4 ZMW). Increase the amount and try again.';
                if (failed) {
                    await notifyDepositFailed(tx, minError, { user });
                }
                return {
                    ok: false,
                    reason: 'failed',
                    error: minError,
                };
            }
            txHash = await StellarService.sendXLM(platformSecret, walletPublic, amountStr);
        }

        await completeBuyTransaction(String(tx.id), txHash);
        console.log(`creditBuyDeposit: completed ${reference}, txHash ${txHash}`);

        const pushToken = user.push_token as string | undefined;
        if (pushToken) {
            const a = (tx.asset || 'xlm') as string;
            const amount = Number(tx.amount_xlm);
            sendPushNotification(
                pushToken,
                'Deposit complete',
                `${amount} ${a.toUpperCase()} added to your wallet.`,
                { type: 'deposit', amount, asset: a }
            ).catch(() => {});
        }

        await notifyDepositSuccess(tx, { txHash, user });

        return { ok: true, txHash };
    } catch (stellarError) {
        const errMsg = parseStellarError(stellarError);
        console.error('creditBuyDeposit: Stellar send failed for', reference, errMsg);
        const failed = await failBuyTransaction(String(tx.id));
        if (failed) {
            await notifyDepositFailed(
                tx,
                'We received your payment but could not send crypto to your wallet. Please contact support.',
                { user }
            );
        }
        return { ok: false, reason: 'failed', error: errMsg };
    }
}

async function releaseProcessingClaim(txId: string): Promise<void> {
    await sql`
        UPDATE transactions
        SET status = 'PENDING', updated_at = NOW()
        WHERE id = ${txId} AND status = 'PROCESSING'
    `;
}

const LENCO_DECLINED_MESSAGE =
    'Your mobile money payment was declined, cancelled, or expired. You can try again from your dashboard.';

async function markDepositFailedByReference(
    reference: string,
    reason: string
): Promise<{ status: 'failed'; asset: string } | null> {
    const existing = await findBuyTransactionByReference(reference);
    if (!existing) return null;
    const asset = String(existing.asset || 'xlm');
    if (String(existing.status) === 'FAILED') {
        return { status: 'failed', asset };
    }
    const failedTx = await failBuyTransactionByReference(reference);
    if (failedTx) {
        await notifyDepositFailed(failedTx, reason);
        return { status: 'failed', asset };
    }
    return null;
}

/** Poll Lenco (when paid) and credit a pending BUY transaction. Safe to call repeatedly. */
export async function tryCompleteBuyDeposit(
    reference: string,
    opts?: { userId?: string; skipLencoVerification?: boolean }
): Promise<{ status: BuyDepositCompletionStatus; txHash?: string; asset?: string }> {
    const existing = await findBuyTransactionByReference(reference);
    if (!existing) return { status: 'pending' };

    if (opts?.userId && String(existing.user_id) !== opts.userId) {
        return { status: 'pending' };
    }

    const st = String(existing.status);
    const asset = String(existing.asset || 'xlm');

    if (st === 'COMPLETED') {
        return {
            status: 'completed',
            txHash: existing.tx_hash ? String(existing.tx_hash) : undefined,
            asset,
        };
    }
    if (st === 'FAILED') return { status: 'failed', asset };
    if (st !== 'PENDING') return { status: 'pending', asset };

    const skipVerification =
        opts?.skipLencoVerification === true ||
        process.env.LENCO_SKIP_DEPOSIT_VERIFICATION === 'true';

    if (!skipVerification) {
        const collection = await LencoService.getCollectionByReference(reference);
        if (collection?.status === 'failed') {
            const failed = await markDepositFailedByReference(reference, LENCO_DECLINED_MESSAGE);
            if (failed) return failed;
        }

        const paid = await isLencoDepositPaid(reference);
        if (!paid) return { status: 'pending', asset };
    }

    const claimed = await claimPendingBuyTransaction(reference);
    if (!claimed) return { status: 'pending', asset };

    const result = await creditBuyDeposit(claimed, reference);
    if (result.ok) {
        return { status: 'completed', txHash: result.txHash, asset };
    }

    if (result.reason === 'waiting_trustline') {
        await releaseProcessingClaim(String(claimed.id));
        return { status: 'waiting_trustline', asset };
    }

    return { status: 'failed', asset };
}

/** Complete all pending deposits for a user (used by dashboard polling). */
export async function tryCompleteUserPendingDeposits(userId: string): Promise<
    Array<{ reference: string; status: BuyDepositCompletionStatus; txHash?: string; asset?: string }>
> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const rows = await sql`
        SELECT reference FROM transactions
        WHERE user_id = ${userId}
          AND type = 'BUY'
          AND status = 'PENDING'
          AND created_at >= ${since}
        ORDER BY created_at ASC
        LIMIT 10
    `;

    const results: Array<{
        reference: string;
        status: BuyDepositCompletionStatus;
        txHash?: string;
        asset?: string;
    }> = [];

    for (const row of rows as unknown as { reference: string }[]) {
        const reference = String(row.reference ?? '').trim();
        if (!reference) continue;
        const outcome = await tryCompleteBuyDeposit(reference, { userId });
        results.push({ reference, ...outcome });
    }

    return results;
}
