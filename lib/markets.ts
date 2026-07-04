/**
 * Country/market configuration. Zambia is live; add entries here for new countries.
 */

export type CountryCode = 'ZM';

export type PaymentMethod = 'mobile_money';

export type MobileOperatorId = 'mtn' | 'airtel' | 'zamtel';

export interface MobileOperator {
    id: MobileOperatorId;
    label: string;
}

export const MOBILE_OPERATOR_BRANDS: Record<
    MobileOperatorId,
    { logo: string; accent: string; ring: string }
> = {
    mtn: { logo: '/assets/operators/mtn.svg', accent: '#FFCB05', ring: 'rgba(255, 203, 5, 0.45)' },
    airtel: { logo: '/assets/operators/airtel.svg', accent: '#E40000', ring: 'rgba(228, 0, 0, 0.4)' },
    zamtel: { logo: '/assets/operators/zamtel.svg', accent: '#0072BC', ring: 'rgba(0, 114, 188, 0.4)' },
};

export interface IdDocumentType {
    id: string;
    label: string;
}

export interface MarketConfig {
    countryCode: CountryCode;
    countryName: string;
    currency: string;
    phoneCountryCode: string;
    phoneDialCode: string;
    paymentMethods: PaymentMethod[];
    mobileOperators: MobileOperator[];
    idDocumentTypes: IdDocumentType[];
    lencoCountryCode: string;
}

export const MARKETS: Record<CountryCode, MarketConfig> = {
    ZM: {
        countryCode: 'ZM',
        countryName: 'Zambia',
        currency: 'ZMW',
        phoneCountryCode: '260',
        phoneDialCode: '+260',
        paymentMethods: ['mobile_money'],
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
    },
};

export const DEFAULT_COUNTRY: CountryCode = 'ZM';

export function resolveCountryCode(code?: string | null): CountryCode {
    const upper = code?.trim().toUpperCase();
    if (upper && upper in MARKETS) return upper as CountryCode;
    return DEFAULT_COUNTRY;
}

export function getMarket(countryCode?: string | null): MarketConfig {
    return MARKETS[resolveCountryCode(countryCode)];
}

export function listMarkets(): MarketConfig[] {
    return Object.values(MARKETS);
}

export function isSupportedCountry(code: string): code is CountryCode {
    return code.trim().toUpperCase() in MARKETS;
}

export function marketSupportsPayment(
    countryCode: string | null | undefined,
    method: PaymentMethod
): boolean {
    return getMarket(countryCode).paymentMethods.includes(method);
}

export function marketToJson(market: MarketConfig) {
    return {
        countryCode: market.countryCode,
        countryName: market.countryName,
        currency: market.currency,
        phoneDialCode: market.phoneDialCode,
        paymentMethods: market.paymentMethods,
        mobileOperators: market.mobileOperators,
        idDocumentTypes: market.idDocumentTypes,
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
