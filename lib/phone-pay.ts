import { randomBytes } from 'crypto';
import { sql } from '@/lib/db';
import { normalizeZambianPhone, phonesMatch } from '@/lib/phone';
import { StellarService } from '@/lib/stellar';
import { PLATFORM_WALLET_PUBLIC } from '@/lib/constants';
import { getPlatformWalletSecret } from '@/lib/platform-signer';
import { getUserWalletSecret } from '@/lib/signer';
import { sendPushNotification } from '@/lib/push';
import { notifyPhoneTransfer } from '@/lib/notifications';

const PENDING_TTL_DAYS = 30;

export function formatDisplayPhone(normalized: string): string {
    const digits = normalized.replace(/\D/g, '');
    if (digits.startsWith('260') && digits.length >= 12) {
        return `0${digits.slice(3)}`;
    }
    return digits;
}

export async function syncPhoneNormalized(userId: string, phone: string): Promise<string | null> {
    const normalized = phone.replace(/\D/g, '').length >= 10 ? normalizeZambianPhone(phone) : null;
    if (normalized) {
        await sql`
            UPDATE users SET phone_normalized = ${normalized}, updated_at = NOW()
            WHERE id = ${userId}
        `;
    }
    return normalized;
}

export type PhoneRecipient =
    | { kind: 'user'; userId: string; walletPublic: string; displayName: string | null }
    | { kind: 'unregistered'; phoneNormalized: string; displayPhone: string };

export async function resolvePhoneRecipient(phone: string, senderId: string): Promise<PhoneRecipient> {
    const normalized = normalizeZambianPhone(phone);
    const senderRows = await sql`SELECT phone_normalized, phone_number FROM users WHERE id = ${senderId} LIMIT 1`;
    const sender = senderRows[0] as { phone_normalized?: string | null; phone_number?: string | null } | undefined;
    const senderNorm =
        sender?.phone_normalized ||
        (sender?.phone_number ? normalizeZambianPhone(String(sender.phone_number)) : null);
    if (senderNorm && senderNorm === normalized) {
        throw new Error('You cannot send money to your own phone number.');
    }

    const rows = await sql`
        SELECT id, wallet_public, full_name, phone_normalized
        FROM users
        WHERE phone_normalized = ${normalized}
           OR (
             phone_normalized IS NULL
             AND phone_number IS NOT NULL
             AND regexp_replace(phone_number, '\\D', '', 'g') LIKE ${'%' + normalized.slice(-9)}
           )
        LIMIT 1
    `;
    const user = rows[0] as {
        id: string;
        wallet_public: string;
        full_name?: string | null;
        phone_normalized?: string | null;
    } | undefined;

    if (user) {
        if (!user.phone_normalized) {
            await syncPhoneNormalized(user.id, phone);
        }
        return {
            kind: 'user',
            userId: user.id,
            walletPublic: user.wallet_public,
            displayName: user.full_name ?? null,
        };
    }

    return {
        kind: 'unregistered',
        phoneNormalized: normalized,
        displayPhone: formatDisplayPhone(normalized),
    };
}

export async function executePendingPhoneTransfer(opts: {
    senderId: string;
    senderSecret: string;
    phone: string;
    amount: number;
    asset: 'xlm' | 'usdc';
    memo?: string;
}): Promise<{ claimToken: string; escrowTxHash: string; claimUrl: string }> {
    const normalized = normalizeZambianPhone(opts.phone);
    const claimToken = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + PENDING_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const amountStr = opts.amount.toFixed(7);
    const escrowMemo = `CLAIM-${claimToken.slice(0, 12)}`;

    const escrowTxHash =
        opts.asset === 'usdc'
            ? await StellarService.sendUSDC(opts.senderSecret, PLATFORM_WALLET_PUBLIC, amountStr, escrowMemo)
            : await StellarService.sendXLM(opts.senderSecret, PLATFORM_WALLET_PUBLIC, amountStr, escrowMemo);

    await sql`
        INSERT INTO pending_phone_transfers (
            sender_id, recipient_phone, recipient_phone_normalized,
            amount, asset, memo, claim_token, escrow_tx_hash, expires_at
        )
        VALUES (
            ${opts.senderId},
            ${opts.phone},
            ${normalized},
            ${opts.amount},
            ${opts.asset},
            ${opts.memo ?? null},
            ${claimToken},
            ${escrowTxHash},
            ${expiresAt}
        )
    `;

    const origin = process.env.AUTH_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    const claimUrl = `${origin}/claim/${claimToken}`;

    await notifyPhoneTransfer({
        recipientPhone: opts.phone,
        amount: opts.amount,
        asset: opts.asset,
        claimUrl,
        isRegistered: false,
    });

    return { claimToken, escrowTxHash, claimUrl };
}

export async function notifyRegisteredRecipient(opts: {
    recipientUserId: string;
    senderName: string | null;
    amount: number;
    asset: string;
}): Promise<void> {
    const rows = await sql`
        SELECT push_token, phone_number FROM users WHERE id = ${opts.recipientUserId} LIMIT 1
    `;
    const user = rows[0] as { push_token?: string | null; phone_number?: string | null } | undefined;
    const title = 'Money received';
    const body = `${opts.senderName ?? 'Someone'} sent you ${opts.amount} ${opts.asset.toUpperCase()} on Stepay.`;
    if (user?.push_token) {
        await sendPushNotification(user.push_token, title, body, {
            type: 'phone_receive',
            amount: opts.amount,
            asset: opts.asset,
        });
    }
    if (user?.phone_number) {
        await notifyPhoneTransfer({
            recipientPhone: user.phone_number,
            amount: opts.amount,
            asset: opts.asset as 'xlm' | 'usdc',
            claimUrl: `${process.env.AUTH_URL?.replace(/\/$/, '') || 'http://localhost:3000'}/dashboard`,
            isRegistered: true,
            senderName: opts.senderName,
        });
    }
}

export async function getPendingTransferByToken(token: string) {
    const rows = await sql`
        SELECT p.*, u.full_name AS sender_name
        FROM pending_phone_transfers p
        JOIN users u ON u.id = p.sender_id
        WHERE p.claim_token = ${token}
        LIMIT 1
    `;
    return (rows[0] as Record<string, unknown> | undefined) ?? null;
}

export async function claimPendingTransfer(token: string, claimerUserId: string): Promise<{ txHash: string }> {
    const pending = await getPendingTransferByToken(token);
    if (!pending) throw new Error('Transfer not found or already claimed.');
    if (pending.status !== 'pending') throw new Error('This transfer is no longer available.');
    if (new Date(String(pending.expires_at)).getTime() < Date.now()) {
        await sql`UPDATE pending_phone_transfers SET status = 'expired' WHERE id = ${String(pending.id)}`;
        throw new Error('This transfer has expired.');
    }

    const claimerRows = await sql`
        SELECT phone_number, phone_normalized, wallet_public FROM users WHERE id = ${claimerUserId} LIMIT 1
    `;
    const claimer = claimerRows[0] as {
        phone_number?: string | null;
        phone_normalized?: string | null;
        wallet_public: string;
    } | undefined;
    if (!claimer) throw new Error('Account not found.');

    const claimerPhone = claimer.phone_number ?? '';
    if (!phonesMatch(claimerPhone, String(pending.recipient_phone))) {
        throw new Error('This transfer was sent to a different phone number. Sign in with the matching number.');
    }

    await syncPhoneNormalized(claimerUserId, claimerPhone);

    const claimed = await sql`
        UPDATE pending_phone_transfers
        SET status = 'claimed', claimed_by = ${claimerUserId}, claimed_at = NOW()
        WHERE id = ${String(pending.id)} AND status = 'pending'
        RETURNING *
    `;
    if (!claimed.length) throw new Error('Transfer already claimed.');

    const asset = String(pending.asset || 'usdc') as 'xlm' | 'usdc';
    const amount = Number(pending.amount);
    const amountStr = amount.toFixed(7);
    const platformSecret = getPlatformWalletSecret();

    if (asset === 'usdc') {
        let claimerSecret: string | null = null;
        try {
            claimerSecret = await getUserWalletSecret(claimerUserId);
        } catch {
            claimerSecret = null;
        }
        if (claimerSecret) {
            await StellarService.ensureUSDCTrustline(claimerSecret);
        } else {
            const hasTrust = await StellarService.hasUSDCTrustline(claimer.wallet_public);
            if (!hasTrust) {
                throw new Error('Enable USDC on your wallet before claiming this transfer.');
            }
        }
    }

    const txHash =
        asset === 'usdc'
            ? await StellarService.sendUSDC(platformSecret, claimer.wallet_public, amountStr)
            : await StellarService.sendXLM(platformSecret, claimer.wallet_public, amountStr);

    await sql`
        UPDATE pending_phone_transfers SET payout_tx_hash = ${txHash} WHERE id = ${String(pending.id)}
    `;

    await sql`
        INSERT INTO transactions (user_id, type, amount_fiat, amount_xlm, status, reference, tx_hash, asset)
        VALUES (
            ${claimerUserId},
            'RECEIVE',
            0,
            ${amount},
            'COMPLETED',
            ${`CLAIM-${token.slice(0, 8)}`},
            ${txHash},
            ${asset}
        )
    `;

    return { txHash };
}

/** Auto-claim pending transfers when user completes profile with matching phone. */
export async function autoClaimPendingForUser(userId: string): Promise<number> {
    const rows = await sql`
        SELECT phone_number FROM users WHERE id = ${userId} LIMIT 1
    `;
    const phone = (rows[0] as { phone_number?: string | null } | undefined)?.phone_number;
    if (!phone) return 0;

    const normalized = await syncPhoneNormalized(userId, phone);
    if (!normalized) return 0;

    const pending = await sql`
        SELECT claim_token FROM pending_phone_transfers
        WHERE recipient_phone_normalized = ${normalized}
          AND status = 'pending'
          AND expires_at > NOW()
    `;

    let claimed = 0;
    for (const row of pending as unknown as { claim_token: string }[]) {
        try {
            await claimPendingTransfer(row.claim_token, userId);
            claimed++;
        } catch {
            // skip failed claims
        }
    }
    return claimed;
}
