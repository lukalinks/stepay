export const PLATFORM_WALLET_PUBLIC = (
    process.env.PLATFORM_WALLET_PUBLIC_KEY ?? process.env.PLATFORM_WALLET_PUBLIC ?? 'GA7...EXAMPLE...XLM...WALLET'
).trim();

/** ZMW per 1 XLM */
export const XLM_RATE_ZMW = Number(process.env.XLM_RATE_ZMW || 3.5);

/** ZMW per 1 USDC (1 USDC ≈ 1 USD; ZMW/USD ~25) */
export const USDC_RATE_ZMW = Number(process.env.USDC_RATE_ZMW || 25);

/** USDC on Stellar - Circle issuer (mainnet) */
export const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

/** Minimum XLM balance before a USDC trustline can be added (base + trustline reserves). */
export const MIN_XLM_FOR_USDC_TRUSTLINE = 1.5;

/** XLM sent when creating a new account intended to receive USDC. */
export const MIN_XLM_NEW_ACCOUNT_FOR_USDC = 2;
