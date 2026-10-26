import { sql } from '@/lib/db';
import { PLATFORM_WALLET_PUBLIC } from '@/lib/constants';
import { StellarService } from '@/lib/stellar';

const LENCO_API_URL = (process.env.LENCO_API_URL || 'https://api.lenco.co/access/v2').trim();

/** Keep a small XLM buffer on the platform wallet for fees / activation sends. */
const PLATFORM_XLM_RESERVE = 2;
/** Keep a tiny USDC buffer so rounding / concurrent credits don't overdraw. */
const PLATFORM_USDC_RESERVE = 0.5;

export const LIQUIDITY_UNAVAILABLE_MESSAGE =
    'This service is not available right now. Please try again later or contact support.';

export const CASH_OUT_UNAVAILABLE_MESSAGE =
    'Cash out is not available right now. Please try again later or contact support.';

export const DEPOSIT_UNAVAILABLE_MESSAGE =
    'Deposits are not available right now. Please try again later or contact support.';

let lencoFloatCache: { value: number | null; expiry: number } | null = null;
const LENCO_FLOAT_CACHE_MS = 15_000;

/**
 * Available Lenco mobile-money float (ZMW) for the configured account.
 * Returns null when the balance cannot be read (treat as unavailable for payouts).
 */
export async function getLencoAvailableFloat(): Promise<number | null> {
    if (lencoFloatCache && Date.now() < lencoFloatCache.expiry) {
        return lencoFloatCache.value;
    }

    const key = process.env.LENCO_SECRET_KEY?.trim();
    const accountId = process.env.LENCO_ACCOUNT_ID?.trim();
    if (!key) {
        lencoFloatCache = { value: null, expiry: Date.now() + LENCO_FLOAT_CACHE_MS };
        return null;
    }

    try {
        let available: number | null = null;

        if (accountId) {
            const res = await fetch(`${LENCO_API_URL}/accounts/${encodeURIComponent(accountId)}/balance`, {
                headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
                signal: AbortSignal.timeout(8000),
            });
            const body = await res.json().catch(() => ({}));
            const bal =
                body?.data?.availableBalance ?? body?.data?.balance ?? body?.data?.ledgerBalance;
            if (bal != null && res.ok) {
                available = Number(bal);
            }
        }

        if (available == null || !Number.isFinite(available)) {
            const res = await fetch(`${LENCO_API_URL}/accounts`, {
                headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
                signal: AbortSignal.timeout(8000),
            });
            const body = await res.json().catch(() => ({}));
            const accounts = Array.isArray(body?.data) ? body.data : body?.data ? [body.data] : [];
            const match = accountId
                ? accounts.find((a: { id?: string }) => String(a.id) === accountId)
                : accounts[0];
            const bal = match?.availableBalance ?? match?.balance ?? match?.ledgerBalance ?? match?.currentBalance;
            if (bal != null) available = Number(bal);
        }

        if (available == null || !Number.isFinite(available)) {
            lencoFloatCache = { value: null, expiry: Date.now() + LENCO_FLOAT_CACHE_MS };
            return null;
        }

        lencoFloatCache = { value: available, expiry: Date.now() + LENCO_FLOAT_CACHE_MS };
        return available;
    } catch (err) {
        console.warn('getLencoAvailableFloat:', err);
        lencoFloatCache = { value: null, expiry: Date.now() + LENCO_FLOAT_CACHE_MS };
        return null;
    }
}

async function pendingSellPayoutZmw(): Promise<number> {
    const rows = await sql`
        SELECT COALESCE(SUM(amount_fiat), 0)::float8 AS total
        FROM transactions
        WHERE type = 'SELL' AND status IN ('PENDING', 'PROCESSING', 'PAYOUT_FAILED')
    `;
    return Number((rows[0] as { total?: number } | undefined)?.total || 0);
}

/**
 * Ensure Lenco has enough float for a cash-out payout (before taking user's crypto).
 * Reserves amounts already committed to pending/processing sells.
 */
export async function assertLencoPayoutAvailable(amountZmw: number): Promise<void> {
    if (!(amountZmw > 0)) return;

    // When payouts are intentionally disabled, skip float gate.
    if (process.env.LENCO_PAYOUT_ENABLED === 'false') return;

    const [float, reserved] = await Promise.all([getLencoAvailableFloat(), pendingSellPayoutZmw()]);
    if (float == null) {
        console.error('assertLencoPayoutAvailable: could not read Lenco float');
        throw new Error(CASH_OUT_UNAVAILABLE_MESSAGE);
    }

    const free = float - reserved;
    if (free + 1e-6 < amountZmw) {
        console.warn(
            `assertLencoPayoutAvailable: need ${amountZmw} ZMW, float=${float}, reserved=${reserved}, free=${free}`
        );
        throw new Error(CASH_OUT_UNAVAILABLE_MESSAGE);
    }
}

export type PlatformLiquidityNeed = {
    asset: 'xlm' | 'usdc';
    /** Crypto the user should receive from this deposit */
    amountCrypto: number;
    /** Extra XLM needed for wallet activation / trustline (USDC path) */
    activationXlm?: number;
};

/**
 * Ensure the platform Stellar wallet can fund a deposit credit before collecting mobile money.
 */
export async function assertPlatformDepositLiquidity(need: PlatformLiquidityNeed): Promise<void> {
    const amount = Number(need.amountCrypto) || 0;
    const activationXlm = Number(need.activationXlm) || 0;
    if (amount <= 0 && activationXlm <= 0) return;

    try {
        if (need.asset === 'usdc') {
            const usdc = Number(await StellarService.getUSDCBalance(PLATFORM_WALLET_PUBLIC));
            if (usdc < amount + PLATFORM_USDC_RESERVE) {
                console.warn(
                    `assertPlatformDepositLiquidity: need ${amount} USDC, platform has ${usdc}`
                );
                throw new Error(DEPOSIT_UNAVAILABLE_MESSAGE);
            }
            const xlmNeeded = Math.max(activationXlm, 0) + 0.1;
            const xlm = Number(await StellarService.getBalance(PLATFORM_WALLET_PUBLIC));
            if (xlm < xlmNeeded + PLATFORM_XLM_RESERVE) {
                console.warn(
                    `assertPlatformDepositLiquidity: need ~${xlmNeeded} XLM for USDC activation, platform has ${xlm}`
                );
                throw new Error(DEPOSIT_UNAVAILABLE_MESSAGE);
            }
            return;
        }

        const xlmNeeded = amount + Math.max(activationXlm, 0);
        const xlm = Number(await StellarService.getBalance(PLATFORM_WALLET_PUBLIC));
        if (xlm < xlmNeeded + PLATFORM_XLM_RESERVE) {
            console.warn(`assertPlatformDepositLiquidity: need ${xlmNeeded} XLM, platform has ${xlm}`);
            throw new Error(DEPOSIT_UNAVAILABLE_MESSAGE);
        }
    } catch (err) {
        if (err instanceof Error && err.message === DEPOSIT_UNAVAILABLE_MESSAGE) throw err;
        console.error('assertPlatformDepositLiquidity:', err);
        throw new Error(DEPOSIT_UNAVAILABLE_MESSAGE);
    }
}

export function isLiquidityUnavailableError(message: string | undefined | null): boolean {
    if (!message) return false;
    const m = message.toLowerCase();
    return (
        m.includes('not available right now') ||
        m.includes('try again later or contact support') ||
        m === CASH_OUT_UNAVAILABLE_MESSAGE.toLowerCase() ||
        m === DEPOSIT_UNAVAILABLE_MESSAGE.toLowerCase()
    );
}
