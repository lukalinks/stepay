export const PLATFORM_WALLET_PUBLIC = (
    process.env.PLATFORM_WALLET_PUBLIC_KEY ?? process.env.PLATFORM_WALLET_PUBLIC ?? 'GA7...EXAMPLE...XLM...WALLET'
).trim();

/** Fallback ZMW per 1 XLM when live rates are unavailable */
export const XLM_RATE_ZMW = Number(process.env.XLM_RATE_ZMW || 3.5);

/** Fallback ZMW per 1 USDC when live rates are unavailable */
export const USDC_RATE_ZMW = Number(process.env.USDC_RATE_ZMW || 25);

/** USDC on Stellar - Circle issuer (mainnet) */
export const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

/** USDT0 on Stellar - Tether omnichain USDT (mainnet). Cash rails stay on USDC. */
export const USDT0_ISSUER = 'GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q';

/** Stellar Asset Contract for USDT0. Classic payments use the trustline; contracts call this SAC. */
export const USDT0_SAC = 'CBSJZEIO5C7KC2SF3MKSNXXJSW5G3VTNBX4ATMKUI3B2MR4JKM4R26YF';

/** Minimum XLM balance before a USDC trustline can be added (base + trustline reserves). */
export const MIN_XLM_FOR_USDC_TRUSTLINE = 1.5;

/** XLM sent when creating a new account intended to receive USDC. */
export const MIN_XLM_NEW_ACCOUNT_FOR_USDC = 2;

/** Extra ZMW buffer on one-time USDC wallet activation charge. */
export const ACTIVATION_BUFFER_ZMW = Number(process.env.ACTIVATION_BUFFER_ZMW || 1);
