import { USDT0_ISSUER } from '@/lib/constants';
import {
    SEP_USDC_ISSUER,
    sepHomeDomain,
    sepOrigin,
    sepSigningPublicKey,
} from '@/lib/sep-config';

/** Circle USDC on Stellar Testnet (SDF documented issuer). */
export const SEP_TESTNET_USDC_ISSUER =
    process.env.SEP_TESTNET_USDC_ISSUER?.trim() ||
    'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

export type StellarTomlNetwork = 'public' | 'testnet';

export function isTestnetTomlHost(host: string | null | undefined): boolean {
    const h = (host || '').split(':')[0].toLowerCase();
    if (!h) return false;
    const configured = (process.env.SEP_TESTNET_TOML_HOST || 'testnet.stepay.pro').toLowerCase();
    return h === configured || h === `www.${configured}`;
}

export function sepTestnetHomeDomain(): string {
    return (process.env.SEP_TESTNET_TOML_HOST || 'testnet.stepay.pro')
        .replace(/^https?:\/\//i, '')
        .replace(/\/$/, '');
}

export function sepTestnetSigningPublicKey(): string {
    const key = process.env.SEP_TESTNET_SIGNING_PUBLIC_KEY?.trim();
    if (!key?.startsWith('G')) {
        throw new Error('SEP_TESTNET_SIGNING_PUBLIC_KEY is not configured');
    }
    return key;
}

export function sepTestnetSigningSecret(): string {
    const secret = process.env.SEP_TESTNET_SIGNING_SECRET?.trim() || '';
    if (!secret.startsWith('S')) {
        throw new Error('SEP_TESTNET_SIGNING_SECRET is not configured');
    }
    return secret;
}

/** SEP-0001 stellar.toml body for Stepay (public or testnet). */
export function buildStellarToml(network: StellarTomlNetwork = 'public'): string {
    if (network === 'testnet') {
        const home = sepTestnetHomeDomain();
        const origin = `https://${home}`;
        const signing = sepTestnetSigningPublicKey();
        // Auth still proxies through production app APIs; MoneyGram only needs SIGNING_KEY on this domain.
        const webAuth = `${sepOrigin()}/api/sep10/auth`;

        return `# Stepay — SEP-0001 (Stellar Testnet)
VERSION = "2.5.0"
NETWORK_PASSPHRASE = "Test SDF Network ; September 2015"
HORIZON_URL = "https://horizon-testnet.stellar.org"
FEDERATION_SERVER = "${sepOrigin()}/api/federation"
WEB_AUTH_ENDPOINT = "${webAuth}"
SIGNING_KEY = "${signing}"
ACCOUNTS = ["${signing}"]

[DOCUMENTATION]
ORG_NAME = "Stepay"
ORG_URL = "${sepOrigin()}"
ORG_LOGO = "${sepOrigin()}/icon.svg"
ORG_DESCRIPTION = "Non-custodial dollar wallet for Africa — MoneyGram TestNet integration."
ORG_SUPPORT_EMAIL = "support@${sepHomeDomain()}"
ORG_OFFICIAL_EMAIL = "support@${sepHomeDomain()}"

[[CURRENCIES]]
code = "USDC"
issuer = "${SEP_TESTNET_USDC_ISSUER}"
status = "live"
display_decimals = 2
name = "USD Coin (Testnet)"
desc = "USDC on Stellar Testnet"
is_asset_anchored = false
anchor_asset_type = "crypto"
`;
    }

    const home = sepHomeDomain();
    const origin = sepOrigin();
    const signing = sepSigningPublicKey();
    const webAuth = `${origin}/api/sep10/auth`;

    return `# Stepay — SEP-0001
VERSION = "2.5.0"
NETWORK_PASSPHRASE = "Public Global Stellar Network ; September 2015"
HORIZON_URL = "https://horizon.stellar.org"
FEDERATION_SERVER = "${origin}/api/federation"
WEB_AUTH_ENDPOINT = "${webAuth}"
SIGNING_KEY = "${signing}"
ACCOUNTS = ["${signing}"]

[DOCUMENTATION]
ORG_NAME = "Stepay"
ORG_URL = "${origin}"
ORG_LOGO = "${origin}/icon.svg"
ORG_DESCRIPTION = "Non-custodial dollar wallet for Africa — mobile money in and out on Stellar."
ORG_SUPPORT_EMAIL = "support@${home}"
ORG_OFFICIAL_EMAIL = "support@${home}"

[[CURRENCIES]]
code = "USDC"
issuer = "${SEP_USDC_ISSUER}"
status = "live"
display_decimals = 2
name = "USD Coin"
desc = "Circle USDC on Stellar"
is_asset_anchored = false
anchor_asset_type = "crypto"

[[CURRENCIES]]
code = "USDT0"
issuer = "${USDT0_ISSUER}"
status = "live"
display_decimals = 2
name = "USDT0"
desc = "Tether USDT0 on Stellar. Hold and send. Cash in and cash out stay on USDC."
is_asset_anchored = false
anchor_asset_type = "crypto"
`;
}
