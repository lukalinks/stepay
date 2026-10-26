import { sendDepositFailedEmail, sendDepositSuccessEmail } from '@/lib/email';
import { formatLocalCurrencyCode } from '@/lib/markets';
import { notifyDepositByPhone } from '@/lib/notifications';
import { sql } from '@/lib/db';

type UserNotifyProfile = {
    email: string;
    countryCode: string;
    phone?: string | null;
};

async function loadUserProfile(userId: string): Promise<UserNotifyProfile | null> {
    const rows = await sql`
        SELECT email, country_code, phone_number FROM users WHERE id = ${userId} LIMIT 1
    `;
    const user = rows[0] as { email?: string | null; country_code?: string | null; phone_number?: string | null } | undefined;
    const email = String(user?.email ?? '').trim();
    if (!email || !email.includes('@')) return null;
    return {
        email,
        countryCode: String(user?.country_code ?? 'ZM'),
        phone: user?.phone_number ?? null,
    };
}

function txDetails(tx: Record<string, unknown>, countryCode: string) {
    return {
        amountFiat: formatLocalCurrencyCode(Number(tx.amount_fiat), countryCode),
        amountCrypto: Number(tx.amount_xlm),
        asset: String(tx.asset || 'xlm'),
        reference: String(tx.reference ?? ''),
    };
}

/** Fire-and-forget deposit success email. */
export async function notifyDepositSuccess(
    tx: Record<string, unknown>,
    opts?: { txHash?: string; user?: Record<string, unknown> | null }
): Promise<void> {
    try {
        const userId = String(tx.user_id ?? '');
        const profile =
            opts?.user && String(opts.user.email ?? '').includes('@')
                ? {
                      email: String(opts.user.email).trim(),
                      countryCode: String(opts.user.country_code ?? 'ZM'),
                      phone: (opts.user.phone_number as string | null | undefined) ?? null,
                  }
                : await loadUserProfile(userId);
        if (!profile) return;

        const details = txDetails(tx, profile.countryCode);
        const sent = await sendDepositSuccessEmail({
            to: profile.email,
            ...details,
            txHash: opts?.txHash,
        });
        if (!sent) {
            console.warn('[deposit-notify] success email not sent for', details.reference);
        }

        if (profile.phone?.trim()) {
            const asset = details.asset.toUpperCase();
            await notifyDepositByPhone({
                phone: profile.phone,
                message: `Stepay: Your deposit of ${details.amountFiat} is complete. ${details.amountCrypto} ${asset} credited. Ref: ${details.reference}`,
            });
        }
    } catch (err) {
        console.error('[deposit-notify] success email error:', err);
    }
}

/** Fire-and-forget deposit failure email. */
export async function notifyDepositFailed(
    tx: Record<string, unknown>,
    reason?: string,
    opts?: { user?: Record<string, unknown> | null }
): Promise<void> {
    try {
        const userId = String(tx.user_id ?? '');
        const profile =
            opts?.user && String(opts.user.email ?? '').includes('@')
                ? {
                      email: String(opts.user.email).trim(),
                      countryCode: String(opts.user.country_code ?? 'ZM'),
                      phone: (opts.user.phone_number as string | null | undefined) ?? null,
                  }
                : await loadUserProfile(userId);
        if (!profile) return;

        const details = txDetails(tx, profile.countryCode);
        const sent = await sendDepositFailedEmail({
            to: profile.email,
            ...details,
            reason,
        });
        if (!sent) {
            console.warn('[deposit-notify] failure email not sent for', details.reference);
        }

        if (profile.phone?.trim()) {
            await notifyDepositByPhone({
                phone: profile.phone,
                message: `Stepay: Deposit ${details.reference} could not be completed.${reason ? ` ${reason}` : ''} Open the app or contact support.`,
            });
        }
    } catch (err) {
        console.error('[deposit-notify] failure email error:', err);
    }
}
