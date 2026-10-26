/**
 * Country/market configuration.
 * ZM = Lenco mobile money + MoneyGram; other markets = MoneyGram SEP-24 where listed.
 * Any other ISO country falls back to MoneyGram agent cash (USDC).
 */

export type CountryCode = 'ZM' | 'ZA' | 'CD' | 'BW' | 'NA' | 'LS';

export type PaymentMethod = 'mobile_money' | 'stellar_anchor';

export type MobileOperatorId =
    | 'mtn'
    | 'airtel'
    | 'zamtel'
    | 'vodacom'
    | 'cellc'
    | 'telkom'
    | 'mascom'
    | 'orange'
    | 'btc'
    | 'mtc'
    | 'tn_mobile'
    | 'econet';

export interface MobileOperator {
    id: MobileOperatorId;
    label: string;
}

export const MOBILE_OPERATOR_BRANDS: Record<
    string,
    { logo: string; accent: string; ring: string }
> = {
    mtn: { logo: '/assets/operators/mtn.svg', accent: '#FFCB05', ring: 'rgba(255, 203, 5, 0.45)' },
    airtel: { logo: '/assets/operators/airtel.svg', accent: '#E40000', ring: 'rgba(228, 0, 0, 0.4)' },
    zamtel: { logo: '/assets/operators/zamtel.png', accent: '#008736', ring: 'rgba(0, 135, 54, 0.4)' },
    vodacom: { logo: '/assets/operators/mtn.svg', accent: '#E60000', ring: 'rgba(230, 0, 0, 0.4)' },
    cellc: { logo: '/assets/operators/airtel.svg', accent: '#6C2EB9', ring: 'rgba(108, 46, 185, 0.4)' },
    telkom: { logo: '/assets/operators/zamtel.png', accent: '#00A0E3', ring: 'rgba(0, 160, 227, 0.4)' },
    mascom: { logo: '/assets/operators/mtn.svg', accent: '#E30613', ring: 'rgba(227, 6, 19, 0.4)' },
    orange: { logo: '/assets/operators/airtel.svg', accent: '#FF7900', ring: 'rgba(255, 121, 0, 0.4)' },
    btc: { logo: '/assets/operators/zamtel.png', accent: '#0033A0', ring: 'rgba(0, 51, 160, 0.4)' },
};

export interface IdDocumentType {
    id: string;
    label: string;
}

export type MarketAnchorConfig = {
    homeDomain: string;
    assetCode: string;
    partnerName: string;
    /**
     * Non-custodial anchors (e.g. MoneyGram) require SEP-10 `client_domain`
     * plus a co-signature from this wallet's stellar.toml SIGNING_KEY.
     */
    requiresClientDomain?: boolean;
};

export interface MarketConfig {
    countryCode: CountryCode | string;
    countryName: string;
    currency: string;
    phoneCountryCode: string;
    phoneDialCode: string;
    /** National number length (digits after country code), for validation */
    phoneNationalLength: number;
    flagEmoji: string;
    paymentMethods: PaymentMethod[];
    /** True when cash in/out is not live yet */
    comingSoon: boolean;
    mobileOperators: MobileOperator[];
    idDocumentTypes: IdDocumentType[];
    lencoCountryCode: string;
    anchor?: MarketAnchorConfig;
}

const PASSPORT_AND_ID: IdDocumentType[] = [
    { id: 'national_id', label: 'National ID' },
    { id: 'passport', label: 'Passport' },
];

const MONEYGRAM_ANCHOR: MarketAnchorConfig = {
    // Official production home domain (override with MONEYGRAM_HOME_DOMAIN / MONEYGRAM_SANDBOX).
    homeDomain: 'mgxanchor.moneygram.com',
    assetCode: 'USDC',
    partnerName: 'MoneyGram',
    requiresClientDomain: true,
};

export const MARKETS: Record<CountryCode, MarketConfig> = {
    ZM: {
        countryCode: 'ZM',
        countryName: 'Zambia',
        currency: 'ZMW',
        phoneCountryCode: '260',
        phoneDialCode: '+260',
        phoneNationalLength: 9,
        flagEmoji: '🇿🇲',
        // Lenco mobile money + MoneyGram agent cash (USDC)
        paymentMethods: ['mobile_money', 'stellar_anchor'],
        comingSoon: false,
        mobileOperators: [
            { id: 'mtn', label: 'MTN' },
            { id: 'airtel', label: 'Airtel' },
            { id: 'zamtel', label: 'Zamtel' },
        ],
        idDocumentTypes: [
            { id: 'nrc', label: 'NRC' },
            { id: 'passport', label: 'Passport' },
        ],
        lencoCountryCode: 'zm',
        anchor: MONEYGRAM_ANCHOR,
    },
    ZA: {
        countryCode: 'ZA',
        countryName: 'South Africa',
        currency: 'ZAR',
        phoneCountryCode: '27',
        phoneDialCode: '+27',
        phoneNationalLength: 9,
        flagEmoji: '🇿🇦',
        paymentMethods: ['stellar_anchor'],
        comingSoon: false,
        mobileOperators: [
            { id: 'vodacom', label: 'Vodacom' },
            { id: 'mtn', label: 'MTN' },
            { id: 'cellc', label: 'Cell C' },
            { id: 'telkom', label: 'Telkom' },
        ],
        idDocumentTypes: [
            { id: 'smart_id', label: 'Smart ID / ID book' },
            { id: 'passport', label: 'Passport' },
        ],
        lencoCountryCode: '',
        anchor: MONEYGRAM_ANCHOR,
    },
    CD: {
        countryCode: 'CD',
        countryName: 'DR Congo',
        currency: 'CDF',
        phoneCountryCode: '243',
        phoneDialCode: '+243',
        phoneNationalLength: 9,
        flagEmoji: '🇨🇩',
        paymentMethods: ['stellar_anchor'],
        comingSoon: false,
        mobileOperators: [
            { id: 'orange', label: 'Orange' },
            { id: 'airtel', label: 'Airtel' },
            { id: 'vodacom', label: 'Vodacom' },
        ],
        idDocumentTypes: [
            { id: 'national_id', label: 'Carte d’identité / Voter ID' },
            { id: 'passport', label: 'Passport' },
        ],
        lencoCountryCode: '',
        anchor: MONEYGRAM_ANCHOR,
    },
    BW: {
        countryCode: 'BW',
        countryName: 'Botswana',
        currency: 'BWP',
        phoneCountryCode: '267',
        phoneDialCode: '+267',
        phoneNationalLength: 8,
        flagEmoji: '🇧🇼',
        paymentMethods: ['stellar_anchor'],
        comingSoon: false,
        mobileOperators: [
            { id: 'mascom', label: 'Mascom' },
            { id: 'orange', label: 'Orange' },
            { id: 'btc', label: 'BTC' },
        ],
        idDocumentTypes: PASSPORT_AND_ID,
        lencoCountryCode: '',
        anchor: MONEYGRAM_ANCHOR,
    },
    NA: {
        countryCode: 'NA',
        countryName: 'Namibia',
        currency: 'NAD',
        phoneCountryCode: '264',
        phoneDialCode: '+264',
        phoneNationalLength: 9,
        flagEmoji: '🇳🇦',
        paymentMethods: ['stellar_anchor'],
        comingSoon: false,
        mobileOperators: [
            { id: 'mtc', label: 'MTC' },
            { id: 'tn_mobile', label: 'TN Mobile' },
        ],
        idDocumentTypes: PASSPORT_AND_ID,
        lencoCountryCode: '',
        anchor: MONEYGRAM_ANCHOR,
    },
    LS: {
        countryCode: 'LS',
        countryName: 'Lesotho',
        currency: 'LSL',
        phoneCountryCode: '266',
        phoneDialCode: '+266',
        phoneNationalLength: 8,
        flagEmoji: '🇱🇸',
        paymentMethods: ['stellar_anchor'],
        comingSoon: false,
        mobileOperators: [
            { id: 'vodacom', label: 'Vodacom' },
            { id: 'econet', label: 'Econet' },
        ],
        idDocumentTypes: PASSPORT_AND_ID,
        lencoCountryCode: '',
        anchor: MONEYGRAM_ANCHOR,
    },
};

export const DEFAULT_COUNTRY: CountryCode = 'ZM';

/** Lenco / core-market helpers — unknown codes fall back to Zambia (mobile money). */
export function resolveCountryCode(code?: string | null): CountryCode {
    const upper = code?.trim().toUpperCase();
    if (upper && upper in MARKETS) return upper as CountryCode;
    return DEFAULT_COUNTRY;
}

/** Preserve any ISO-3166 alpha-2 for MoneyGram markets; invalid → default. */
export function normalizeCountryCode(code?: string | null): string {
    const upper = code?.trim().toUpperCase() || '';
    if (/^[A-Z]{2}$/.test(upper)) return upper;
    return DEFAULT_COUNTRY;
}

function regionDisplayName(code: string): string {
    try {
        return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
    } catch {
        return code;
    }
}

function regionFlagEmoji(code: string): string {
    if (!/^[A-Z]{2}$/.test(code)) return '🌍';
    const base = 0x1f1e6;
    return String.fromCodePoint(
        ...[...code].map((ch) => base + (ch.charCodeAt(0) - 65))
    );
}

/** ISO regions to skip in signup (not real MoneyGram agent countries). */
const SKIP_SIGNUP_REGIONS = new Set([
    'AQ', 'BV', 'TF', 'HM', 'GS', 'UM', 'EH',
    'EU', 'EZ', 'UN', 'XA', 'XB', 'XC', 'XD', 'XE', 'XF', 'XG', 'XH', 'XI', 'XJ',
    'XK', 'XL', 'XM', 'XN', 'XO', 'XP', 'XQ', 'XR', 'XS', 'XT', 'XU', 'XV', 'XW', 'XX', 'XY', 'XZ',
]);

function allIsoRegionCodes(): string[] {
    try {
        const supported = (
            Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
        ).supportedValuesOf?.('region');
        if (Array.isArray(supported)) {
            return supported.filter((c) => /^[A-Z]{2}$/.test(c) && !SKIP_SIGNUP_REGIONS.has(c));
        }
    } catch {
        /* ignore */
    }
    return Object.keys(MARKETS);
}

function withResolvedMoneygramAnchor(market: MarketConfig): MarketConfig {
    if (!market.anchor?.requiresClientDomain) return market;
    return {
        ...market,
        anchor: {
            ...market.anchor,
            homeDomain: resolveMoneygramHomeDomain(market.anchor.homeDomain),
        },
    };
}

/** MoneyGram operates in 170+ countries — unknown ISO codes still get the agent cash rail. */
export function moneygramFallbackMarket(countryCode: string): MarketConfig {
    const code = countryCode.trim().toUpperCase();
    return withResolvedMoneygramAnchor({
        countryCode: code,
        countryName: regionDisplayName(code),
        currency: 'USD',
        phoneCountryCode: '',
        phoneDialCode: '',
        phoneNationalLength: 15,
        flagEmoji: regionFlagEmoji(code),
        paymentMethods: ['stellar_anchor'],
        comingSoon: false,
        mobileOperators: [],
        idDocumentTypes: PASSPORT_AND_ID,
        lencoCountryCode: '',
        anchor: MONEYGRAM_ANCHOR,
    });
}

export function getMarket(countryCode?: string | null): MarketConfig {
    const upper = countryCode?.trim().toUpperCase() || '';
    if (upper && upper in MARKETS) {
        return withResolvedMoneygramAnchor(MARKETS[upper as CountryCode]);
    }
    if (upper && /^[A-Z]{2}$/.test(upper)) {
        return moneygramFallbackMarket(upper);
    }
    return withResolvedMoneygramAnchor(MARKETS[DEFAULT_COUNTRY]);
}

/** Production: mgxanchor.moneygram.com · sandbox: extmgxanchor.moneygram.com */
export function resolveMoneygramHomeDomain(fallback = 'mgxanchor.moneygram.com'): string {
    const fromEnv = process.env.MONEYGRAM_HOME_DOMAIN?.trim();
    if (fromEnv) {
        return fromEnv.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    }
    const sandbox = (process.env.MONEYGRAM_SANDBOX || '').trim().toLowerCase();
    if (sandbox === '1' || sandbox === 'true' || sandbox === 'yes') {
        return 'extmgxanchor.moneygram.com';
    }
    return fallback.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

export function marketHasMoneyGram(countryCode?: string | null): boolean {
    const m = getMarket(countryCode);
    return m.paymentMethods.includes('stellar_anchor') && Boolean(m.anchor?.partnerName);
}

export function listMarkets(): MarketConfig[] {
    return Object.values(MARKETS).map((m) => withResolvedMoneygramAnchor(m));
}

/**
 * Signup / profile country picker: core markets first, then every other ISO region
 * as MoneyGram agent cash (USDC). MoneyGram’s hosted UI enforces exact coverage.
 */
export function listSelectableMarkets(): MarketConfig[] {
    const primary = listMarkets();
    const primaryCodes = new Set(primary.map((m) => String(m.countryCode).toUpperCase()));
    const others = allIsoRegionCodes()
        .filter((c) => !primaryCodes.has(c))
        .map((c) => moneygramFallbackMarket(c))
        .sort((a, b) => a.countryName.localeCompare(b.countryName));
    return [...primary, ...others];
}

export function isSupportedCountry(code: string): code is CountryCode {
    return code.trim().toUpperCase() in MARKETS;
}

/** Any ISO-3166 alpha-2 — used for signup/profile when MoneyGram is the cash rail. */
export function isSelectableCountry(code: string): boolean {
    const upper = code.trim().toUpperCase();
    return /^[A-Z]{2}$/.test(upper) && !SKIP_SIGNUP_REGIONS.has(upper);
}

export function marketSupportsPayment(
    countryCode: string | null | undefined,
    method: PaymentMethod
): boolean {
    return getMarket(countryCode).paymentMethods.includes(method);
}

export function marketIsComingSoon(countryCode?: string | null): boolean {
    return getMarket(countryCode).comingSoon;
}

export function marketHasCashRail(countryCode?: string | null): boolean {
    const m = getMarket(countryCode);
    return !m.comingSoon && m.paymentMethods.length > 0;
}

export function formatMarketLabel(market: MarketConfig): string {
    if (market.phoneDialCode) {
        return `${market.flagEmoji} ${market.countryName} (${market.phoneDialCode})`;
    }
    return `${market.flagEmoji} ${market.countryName}`;
}

export function marketCashHelperText(market: MarketConfig): string {
    if (market.comingSoon) return 'Coming soon';
    if (market.paymentMethods.includes('mobile_money')) return 'Mobile money';
    if (market.paymentMethods.includes('stellar_anchor') && market.anchor) {
        return market.anchor.partnerName;
    }
    return market.currency;
}

export function marketToJson(market: MarketConfig) {
    return {
        countryCode: market.countryCode,
        countryName: market.countryName,
        currency: market.currency,
        phoneDialCode: market.phoneDialCode,
        flagEmoji: market.flagEmoji,
        paymentMethods: market.paymentMethods,
        comingSoon: market.comingSoon,
        mobileOperators: market.mobileOperators,
        idDocumentTypes: market.idDocumentTypes,
        anchor: market.anchor ?? null,
    };
}

export function formatLocalCurrency(amount: number | string, countryCode?: string | null): string {
    const market = getMarket(countryCode);
    const num = typeof amount === 'string' ? Number(amount) : amount;
    if (!Number.isFinite(num)) return `0.00 ${market.currency}`;
    try {
        return new Intl.NumberFormat('en', {
            style: 'currency',
            currency: market.currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    } catch {
        return `${num.toFixed(2)} ${market.currency}`;
    }
}

export function formatLocalCurrencyCode(amount: number | string, countryCode?: string | null): string {
    const market = getMarket(countryCode);
    const num = typeof amount === 'string' ? Number(amount) : amount;
    if (!Number.isFinite(num)) return `0.00 ${market.currency}`;
    return `${num.toFixed(2)} ${market.currency}`;
}
