import { sql } from '@/lib/db';
import { LencoService } from '@/lib/lenco';
import { StellarService } from '@/lib/stellar';
import { parseStellarError } from '@/lib/stellar-error';
import { getUserWalletSecret } from '@/lib/signer';
import { getPlatformWalletSecret } from '@/lib/platform-signer';
import { sendPushNotification } from '@/lib/push';
import { PLATFORM_WALLET_PUBLIC, USDC_ISSUER } from '@/lib/constants';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
    acquireCreditLease,
    claimPendingBuyTransaction,
    clearCreditLease,
    completeBuyTransaction,
    failBuyTransaction,
    failBuyTransactionByReference,
    findBuyTransactionByReference,
} from '@/lib/deposit-claim';
import { notifyDepositFailed, notifyDepositSuccess } from '@/lib/deposit-notify';
import { recordComplianceAlert } from '@/lib/kyc-tiers';

/** Release stale PROCESSING claims when mobile money never completed. */
const STALE_PROCESSING_MS = 15 * 60 * 1000;

/** Stellar text memos are max 28 bytes — deposit refs are REF- + 24 hex. */
function stellarMemoForReference(reference: string): string {
    return reference.slice(0, 28);
}

export type BuyDepositCompletionStatus =
    | 'completed'
    | 'pending'
    | 'failed'
    | 'waiting_trustline';

function lencoCollectionIsPaid(status: string | undefined): boolean {
    const st = (status || '').toLowerCase();
    return st === 'successful' || st === 'success';
}

function depositAmountsMatch(expected: number, actual: number): boolean {
    const tolerance = Math.max(1, expected * 0.05);
    return Math.abs(actual - expected) <= tolerance;
}

/** Fiat charged via mobile money (deposit + optional one-time activation). */
export function expectedLencoAmount(tx: Record<string, unknown>): number {
    return Number(tx.amount_fiat || 0) + Number(tx.activation_fiat || 0);
}

export async function getLencoDepositStatus(
    reference: string
): Promise<{ status: string | null; amount?: number; reasonForFailure?: string }> {
    const collection = await LencoService.getCollectionByReference(reference);
    if (collection) {
        return {
            status: collection.status,
            amount: collection.amount,
            reasonForFailure: collection.reasonForFailure,
        };
    }
    const legacy = await LencoService.getTransactionByReference(reference);
    if (legacy) {
        return { status: legacy.status };
    }
    return { status: null };
}

export async function isLencoDepositPaid(reference: string, expectedAmountZmw?: number): Promise<boolean> {
    const collection = await LencoService.getCollectionByReference(reference);
    if (collection && lencoCollectionIsPaid(collection.status)) {
        if (
            expectedAmountZmw != null &&
            Number.isFinite(expectedAmountZmw) &&
            collection.amount != null &&
            !depositAmountsMatch(expectedAmountZmw, collection.amount)
        ) {
            console.error(
                `Lenco deposit amount mismatch for ${reference}: expected ${expectedAmountZmw}, got ${collection.amount} — holding credit`
            );
            await recordComplianceAlert({
                alertType: 'deposit_amount_mismatch',
                severity: 'critical',
                message: `Deposit ${reference}: expected ${expectedAmountZmw} ZMW, Lenco paid ${collection.amount}`,
                metadata: { reference, expected: expectedAmountZmw, actual: collection.amount },
            }).catch(() => {});
            return false;
        }
        return true;
    }

    // Legacy path has no reliable amount — only accept when we cannot check a collection.
    if (!collection) {
        const lencoTx = await LencoService.getTransactionByReference(reference);
        if (lencoTx && (lencoTx.status === 'successful' || lencoTx.status === 'success') && lencoTx.type === 'credit') {
            return true;
        }
    }

    return false;
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
    | { ok: false; reason: 'waiting_trustline' | 'failed' | 'busy'; error?: string }
> {
    const txId = String(tx.id);
    const leased = await acquireCreditLease(txId);
    if (!leased) {
        console.log(`creditBuyDeposit: lease busy for ${reference}`);
        return { ok: false, reason: 'busy', error: 'Credit already in progress' };
    }

    const uid = String(tx.user_id);
    const user = await loadUserForDeposit(uid);
    const memo = stellarMemoForReference(reference);

    if (!user) {
        console.warn('creditBuyDeposit: no user for', reference);
        await failBuyTransaction(txId);
        return { ok: false, reason: 'failed', error: 'User not found' };
    }

    const walletPublic = String(user.wallet_public ?? '').trim();
    if (!walletPublic) {
        console.error('creditBuyDeposit: missing wallet public key for', reference);
        const failed = await failBuyTransaction(txId);
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
        const activationXlm = Number(tx.activation_xlm || 0);
        let txHash: string;

        if (asset === 'usdc') {
            let walletSecret: string | null = null;
            try {
                walletSecret = await getUserWalletSecret(uid);
            } catch {
                walletSecret = null;
            }

            // Credit paid activation XLM (account create / trustline reserve) before USDC.
            if (activationXlm > 0) {
                const exists = await StellarService.accountExists(walletPublic);
                const bal = exists ? Number(await StellarService.getBalance(walletPublic)) : 0;
                const stillNeeded = exists
                    ? Math.max(0, activationXlm - bal + 0.01)
                    : activationXlm;
                if (stillNeeded > 0.0000001) {
                    await StellarService.sendXLM(
                        platformSecret,
                        walletPublic,
                        stillNeeded.toFixed(7)
                        // no deposit memo — activation top-up is not the purchase credit
                    );
                }
            } else {
                await StellarService.ensureXlmForUsdcTrustline(platformSecret, walletPublic);
            }

            if (walletSecret) {
                await StellarService.ensureUSDCTrustline(walletSecret);
            } else {
                const hasTrust = await StellarService.hasUSDCTrustline(walletPublic);
                if (!hasTrust) {
                    console.log(`creditBuyDeposit: USDC trustline missing for ${reference}`);
                    await clearCreditLease(txId);
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
            txHash = await StellarService.sendUSDC(platformSecret, walletPublic, amountStr, memo);
        } else {
            const destExists = await StellarService.accountExists(walletPublic);
            if (!destExists && Number(amountStr) < 1) {
                const failed = await failBuyTransaction(txId);
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
            txHash = await StellarService.sendXLM(platformSecret, walletPublic, amountStr, memo);
        }

        await completeBuyTransaction(txId, txHash);
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
        const transient =
            /sequence conflict|tx_bad_seq|504|502|503|timeout|network|try again/i.test(errMsg);
        if (transient) {
            // Keep PENDING so dashboard / retry-pending can credit after Horizon settles.
            await releaseProcessingClaim(txId);
            return { ok: false, reason: 'failed', error: errMsg };
        }
        const failed = await failBuyTransaction(txId);
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
        SET status = 'PENDING',
            credit_lease_until = NULL,
            updated_at = NOW()
        WHERE id = ${txId} AND status = 'PROCESSING'
    `;
}

/**
 * If Stellar send succeeded but DB was not updated, recover via deposit reference memo.
 * Falls back to amount+destination only when memo is missing (legacy sends).
 */
async function findPlatformOutboundPayment(
    walletPublic: string,
    amount: number,
    asset: string,
    sinceIso: string,
    reference: string
): Promise<string | null> {
    const memo = stellarMemoForReference(reference);
    try {
        const byMemo = await StellarService.checkMemoTransaction(PLATFORM_WALLET_PUBLIC, memo);
        if (byMemo && (byMemo as { successful?: boolean }).successful) {
            const hash = (byMemo as { hash?: string }).hash;
            if (hash) {
                // Confirm this tx paid the user the expected asset/amount.
                const ops = await new StellarSdk.Horizon.Server('https://horizon.stellar.org')
                    .operations()
                    .forTransaction(hash)
                    .call();
                const expected = Number(amount).toFixed(7);
                const matched = ops.records.some((op) => {
                    if (op.type !== 'payment' && op.type !== 'create_account') return false;
                    if (op.type === 'create_account') {
                        const create = op as StellarSdk.Horizon.ServerApi.CreateAccountOperationRecord;
                        return (
                            asset !== 'usdc' &&
                            create.account === walletPublic &&
                            create.funder === PLATFORM_WALLET_PUBLIC &&
                            Number(create.starting_balance).toFixed(7) === expected
                        );
                    }
                    const payment = op as StellarSdk.Horizon.ServerApi.PaymentOperationRecord;
                    if (payment.from !== PLATFORM_WALLET_PUBLIC || payment.to !== walletPublic) return false;
                    if (asset === 'usdc') {
                        return (
                            payment.asset_type === 'credit_alphanum4' &&
                            payment.asset_code === 'USDC' &&
                            payment.asset_issuer === USDC_ISSUER &&
                            Number(payment.amount).toFixed(7) === expected
                        );
                    }
                    return payment.asset_type === 'native' && Number(payment.amount).toFixed(7) === expected;
                });
                if (matched) return hash;
            }
        }
    } catch (err) {
        console.warn('findPlatformOutboundPayment memo lookup:', err);
    }

    // Legacy fallback (pre-memo sends): amount + destination + time window, only if unique.
    const sinceMs = new Date(sinceIso).getTime() - 60_000;
    const expected = Number(amount).toFixed(7);
    try {
        const horizon = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
        const page = await horizon.payments().forAccount(walletPublic).order('desc').limit(40).call();
        const candidates: string[] = [];
        for (const op of page.records) {
            if (op.type !== 'payment') continue;
            const payment = op as StellarSdk.Horizon.ServerApi.PaymentOperationRecord;
            if (payment.from !== PLATFORM_WALLET_PUBLIC || payment.to !== walletPublic) continue;
            if (new Date(payment.created_at).getTime() < sinceMs) break;

            if (asset === 'usdc') {
                if (
                    payment.asset_type === 'credit_alphanum4' &&
                    payment.asset_code === 'USDC' &&
                    payment.asset_issuer === USDC_ISSUER &&
                    Number(payment.amount).toFixed(7) === expected
                ) {
                    candidates.push(payment.transaction_hash);
                }
            } else if (payment.asset_type === 'native' && Number(payment.amount).toFixed(7) === expected) {
                candidates.push(payment.transaction_hash);
            }
        }
        if (candidates.length === 1) return candidates[0];
        if (candidates.length > 1) {
            console.warn(
                `findPlatformOutboundPayment: ambiguous legacy match for ${reference} (${candidates.length} candidates) — skipping`
            );
        }
    } catch (err) {
        console.warn('findPlatformOutboundPayment:', err);
    }
    return null;
}

async function resumeProcessingBuyDeposit(
    tx: Record<string, unknown>,
    reference: string,
    opts?: { skipLencoVerification?: boolean }
): Promise<{ status: BuyDepositCompletionStatus; txHash?: string; asset?: string }> {
    const asset = String(tx.asset || 'xlm');
    const updatedAt = tx.updated_at ? new Date(String(tx.updated_at)).getTime() : 0;
    const skipVerification =
        opts?.skipLencoVerification === true ||
        process.env.LENCO_SKIP_DEPOSIT_VERIFICATION === 'true';

    if (!skipVerification) {
        const paid = await isLencoDepositPaid(reference, expectedLencoAmount(tx));
        if (!paid) {
            // Do not release if another worker holds the credit lease.
            const leaseUntil = tx.credit_lease_until ? new Date(String(tx.credit_lease_until)).getTime() : 0;
            const leaseActive = leaseUntil > Date.now();
            if (!leaseActive && updatedAt && Date.now() - updatedAt > STALE_PROCESSING_MS) {
                await releaseProcessingClaim(String(tx.id));
            }
            return { status: 'pending', asset };
        }
    }

    const user = await loadUserForDeposit(String(tx.user_id));
    const walletPublic = String(user?.wallet_public ?? '').trim();
    if (walletPublic) {
        const existingHash = await findPlatformOutboundPayment(
            walletPublic,
            Number(tx.amount_xlm),
            asset,
            String(tx.created_at),
            reference
        );
        if (existingHash) {
            await completeBuyTransaction(String(tx.id), existingHash);
            await notifyDepositSuccess(tx, { txHash: existingHash, user: user ?? undefined });
            return { status: 'completed', txHash: existingHash, asset };
        }
    }

    const result = await creditBuyDeposit(tx, reference);
    if (result.ok) {
        return { status: 'completed', txHash: result.txHash, asset };
    }
    if (result.reason === 'waiting_trustline') {
        return { status: 'waiting_trustline', asset };
    }
    if (result.reason === 'busy') {
        return { status: 'pending', asset };
    }
    return { status: 'failed', asset };
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
): Promise<{
    status: BuyDepositCompletionStatus;
    txHash?: string;
    asset?: string;
    lencoStatus?: string | null;
    dbStatus?: string;
}> {
    const existing = await findBuyTransactionByReference(reference);
    if (!existing) return { status: 'pending' };

    if (opts?.userId && String(existing.user_id) !== opts.userId) {
        return { status: 'pending' };
    }

    const st = String(existing.status);
    const asset = String(existing.asset || 'xlm');

    const lenco = await getLencoDepositStatus(reference);

    if (st === 'COMPLETED') {
        return {
            status: 'completed',
            txHash: existing.tx_hash ? String(existing.tx_hash) : undefined,
            asset,
            lencoStatus: lenco.status,
            dbStatus: st,
        };
    }
    if (st === 'FAILED') {
        // Paid via Lenco but Stellar credit failed earlier — requeue for another attempt.
        const paid =
            opts?.skipLencoVerification ||
            process.env.LENCO_SKIP_DEPOSIT_VERIFICATION === 'true' ||
            (await isLencoDepositPaid(reference, expectedLencoAmount(existing)));
        if (paid && !existing.tx_hash) {
            const requeued = await sql`
                UPDATE transactions
                SET status = 'PENDING', updated_at = NOW()
                WHERE id = ${String(existing.id)} AND status = 'FAILED' AND tx_hash IS NULL
                RETURNING *
            `;
            if (requeued[0]) {
                console.log(`tryCompleteBuyDeposit: requeued paid FAILED deposit ${reference}`);
                return tryCompleteBuyDeposit(reference, opts);
            }
        }
        return { status: 'failed', asset, lencoStatus: lenco.status, dbStatus: st };
    }
    if (st === 'PROCESSING') {
        const resumed = await resumeProcessingBuyDeposit(existing, reference, {
            skipLencoVerification: opts?.skipLencoVerification,
        });
        return { ...resumed, lencoStatus: lenco.status, dbStatus: 'PROCESSING' };
    }
    if (st !== 'PENDING') {
        return { status: 'pending', asset, lencoStatus: lenco.status, dbStatus: st };
    }

    const skipVerification =
        opts?.skipLencoVerification === true ||
        process.env.LENCO_SKIP_DEPOSIT_VERIFICATION === 'true';

    if (!skipVerification) {
        const collection = await LencoService.getCollectionByReference(reference);
        if (collection?.status === 'failed') {
            const failed = await markDepositFailedByReference(reference, LENCO_DECLINED_MESSAGE);
            if (failed) return failed;
        }

        const paid = await isLencoDepositPaid(reference, expectedLencoAmount(existing));
        if (!paid) {
            return { status: 'pending', asset, lencoStatus: lenco.status, dbStatus: st };
        }
    }

    const claimed = await claimPendingBuyTransaction(reference);
    if (!claimed) {
        return { status: 'pending', asset, lencoStatus: lenco.status, dbStatus: st };
    }

    const result = await creditBuyDeposit(claimed, reference);
    if (result.ok) {
        return {
            status: 'completed',
            txHash: result.txHash,
            asset,
            lencoStatus: lenco.status ?? 'successful',
            dbStatus: 'COMPLETED',
        };
    }

    if (result.reason === 'waiting_trustline') {
        return { status: 'waiting_trustline', asset, lencoStatus: lenco.status, dbStatus: 'PROCESSING' };
    }
    if (result.reason === 'busy') {
        return { status: 'pending', asset, lencoStatus: lenco.status, dbStatus: 'PROCESSING' };
    }

    return { status: 'failed', asset, lencoStatus: lenco.status, dbStatus: 'FAILED' };
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
          AND (
            status IN ('PENDING', 'PROCESSING')
            OR (status = 'FAILED' AND tx_hash IS NULL)
          )
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
