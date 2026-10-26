import { sql } from '@/lib/db';
import { StellarService } from '@/lib/stellar';
import { getPlatformWalletSecret } from '@/lib/platform-signer';
import { getUserWalletSecret } from '@/lib/signer';
import { getRates } from '@/lib/rates';
import { quoteWalletActivation } from '@/lib/wallet-activation';

export type UsdcDepositReadiness = {
    ready: boolean;
    walletCustody: 'self' | 'hosted';
    hasTrustline: boolean;
    hasAccount: boolean;
    needsUnlock: boolean;
    activationRequired: boolean;
    activationXlm: number;
    activationFiat: number;
};

function isHostedWallet(user: Record<string, unknown>): boolean {
    // Server-held signing secret only — cloud vault backup uses wallet_backup_enc, not these.
    return !!(user.wallet_secret_enc || (user.wallet_secret && String(user.wallet_secret).trim()));
}

export async function getUsdcDepositReadiness(userId: string): Promise<UsdcDepositReadiness | null> {
    const userRows = await sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`;
    const user = userRows[0] as Record<string, unknown> | undefined;
    if (!user) return null;

    const walletPublic = String(user.wallet_public ?? '').trim();
    if (!walletPublic) return null;

    const hosted = isHostedWallet(user);
    const hasAccount = await StellarService.accountExists(walletPublic);
    const hasTrustline = hasAccount ? await StellarService.hasUSDCTrustline(walletPublic) : false;
    const rates = await getRates();
    const activation = await quoteWalletActivation(walletPublic, 'usdc', rates);

    return {
        ready: hasTrustline,
        walletCustody: hosted ? 'hosted' : 'self',
        hasTrustline,
        hasAccount,
        // Only prompt unlock when the account can actually submit a trustline tx.
        needsUnlock: !hosted && !hasTrustline && hasAccount && !activation.required,
        activationRequired: activation.required,
        activationXlm: activation.xlm,
        activationFiat: activation.fiat,
    };
}

export type PrepareUsdcResult =
    | {
          ok: true;
          ready: boolean;
          deferredActivation?: boolean;
          needsUnlock?: boolean;
          code?: string;
      }
    | { ok: false; code: string; error: string };

/**
 * Prepare USDC receive path.
 * If activation XLM is unpaid/unfunded, skip free platform top-up — buyer pays with deposit.
 */
export async function prepareUsdcDepositWallet(userId: string): Promise<PrepareUsdcResult> {
    const userRows = await sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`;
    const user = userRows[0] as Record<string, unknown> | undefined;
    if (!user) {
        return { ok: false, code: 'no_user', error: 'User not found.' };
    }

    const walletPublic = String(user.wallet_public ?? '').trim();
    if (!walletPublic) {
        return { ok: false, code: 'no_wallet', error: 'Wallet not found. Sign out and sign in again.' };
    }

    const rates = await getRates();
    const activation = await quoteWalletActivation(walletPublic, 'usdc', rates);

    if (activation.required) {
        return {
            ok: true,
            ready: false,
            deferredActivation: true,
            code: 'activation_required',
        };
    }

    const hosted = isHostedWallet(user);
    const hasTrust = await StellarService.hasUSDCTrustline(walletPublic);
    if (hasTrust) {
        return { ok: true, ready: true };
    }

    // Self-custody: client must sign trustline — not an HTTP error.
    if (!hosted) {
        return {
            ok: true,
            ready: false,
            needsUnlock: true,
            code: 'usdc_trustline_required',
        };
    }

    try {
        const platformSecret = getPlatformWalletSecret();
        await StellarService.ensureXlmForUsdcTrustline(platformSecret, walletPublic);
        const walletSecret = await getUserWalletSecret(userId);
        await StellarService.ensureUSDCTrustline(walletSecret);
        const ready = await StellarService.waitForUSDCTrustline(walletPublic, 8, 1500);
        if (!ready) {
            return {
                ok: true,
                ready: false,
                code: 'trustline_pending',
            };
        }
        return { ok: true, ready: true };
    } catch (err) {
        console.error('prepareUsdcDepositWallet hosted trustline:', err);
        return {
            ok: false,
            code: 'trustline_failed',
            error: 'Could not enable USDC on your wallet. Please try again or contact support.',
        };
    }
}
