import { PLATFORM_WALLET_PUBLIC, USDC_ISSUER } from '@/lib/constants';

/** Public home domain for SEPs (no protocol). */
export function sepHomeDomain(): string {
    const fromEnv = process.env.SEP_HOME_DOMAIN?.trim();
    if (fromEnv) return fromEnv.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    try {
        const auth = process.env.AUTH_URL?.trim();
        if (auth) return new URL(auth).hostname;
    } catch {
        // fall through
    }
    return 'stepay.pro';
}

export function sepOrigin(): string {
    const auth = process.env.AUTH_URL?.replace(/\/$/, '');
    if (auth) return auth;
    return `https://${sepHomeDomain()}`;
}

/** Account that signs SEP-10 challenges (must match SIGNING_KEY in stellar.toml). */
export function sepSigningPublicKey(): string {
    return (
        process.env.SEP_SIGNING_PUBLIC_KEY?.trim() ||
        PLATFORM_WALLET_PUBLIC
    );
}

export function sepSigningSecret(): string {
    const secret =
        process.env.SEP_SIGNING_SECRET?.trim() ||
        process.env.PLATFORM_WALLET_SECRET?.trim() ||
        '';
    if (!secret.startsWith('S')) {
        throw new Error('SEP signing secret is not configured');
    }
    return secret;
}

export function sepNetworkPassphrase(): string {
    return process.env.STELLAR_NETWORK_PASSPHRASE?.trim() || 'Public Global Stellar Network ; September 2015';
}

export const SEP_USDC_ISSUER = USDC_ISSUER;
