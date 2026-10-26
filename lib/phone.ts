import { getMarket } from './markets';

/** Normalize Zambian mobile numbers to digits with country code (260…). */
export function normalizeZambianPhone(phone: string): string {
    const digits = phone.replace(/\s+/g, '').replace(/^\+/, '').replace(/^0/, '').replace(/\D/g, '');
    if (digits.startsWith('260')) return digits.slice(0, 12);
    return `260${digits}`.slice(0, 12);
}

export function isValidZambianPhone(phone: string): boolean {
    return /^260[0-9]{9}$/.test(normalizeZambianPhone(phone));
}

/** E.164 format for Lenco (+260971234567). */
export function formatZambianPhoneE164(phone: string): string {
    const normalized = normalizeZambianPhone(phone);
    if (!/^260[0-9]{9}$/.test(normalized)) {
        throw new Error('Enter a valid mobile number (9 digits after 097…).');
    }
    return `+${normalized}`;
}

export function localPhoneDisplay(phone: string): string {
    const normalized = normalizeZambianPhone(phone);
    return normalized.startsWith('260') ? normalized.slice(3) : normalized;
}

export function phonesMatch(a: string, b: string): boolean {
    try {
        return normalizePhoneForMarket(a) === normalizePhoneForMarket(b);
    } catch {
        return normalizeZambianPhone(a) === normalizeZambianPhone(b);
    }
}

function digitsOnly(phone: string): string {
    return phone.replace(/\s+/g, '').replace(/^\+/, '').replace(/\D/g, '');
}

/** Normalize to country-code + national digits (no +). */
export function normalizePhoneForMarket(phone: string, countryCode?: string | null): string {
    const market = getMarket(countryCode);
    const cc = market.phoneCountryCode;
    let digits = digitsOnly(phone);

    // MoneyGram-only / unknown dial plans — keep international digits as entered.
    if (!cc) {
        return digits.slice(0, 15);
    }

    const len = market.phoneNationalLength;

    if (digits.startsWith(cc)) {
        digits = digits.slice(0, cc.length + len);
        return digits;
    }

    // Strip leading 0 (national trunk)
    if (digits.startsWith('0')) {
        digits = digits.slice(1);
    }

    return `${cc}${digits}`.slice(0, cc.length + len);
}

export function isValidPhoneForMarket(phone: string, countryCode?: string | null): boolean {
    const market = getMarket(countryCode);
    const normalized = normalizePhoneForMarket(phone, countryCode);
    if (!market.phoneCountryCode) {
        return /^[0-9]{8,15}$/.test(normalized);
    }
    const re = new RegExp(`^${market.phoneCountryCode}[0-9]{${market.phoneNationalLength}}$`);
    return re.test(normalized);
}

export function formatPhoneE164ForMarket(phone: string, countryCode?: string | null): string {
    const market = getMarket(countryCode);
    if (!isValidPhoneForMarket(phone, countryCode)) {
        throw new Error(
            market.phoneDialCode
                ? `Enter a valid ${market.countryName} mobile number (${market.phoneNationalLength} digits after ${market.phoneDialCode}).`
                : `Enter a valid phone number for ${market.countryName}.`
        );
    }
    return `+${normalizePhoneForMarket(phone, countryCode)}`;
}

export function localPhoneDisplayForMarket(phone: string, countryCode?: string | null): string {
    const market = getMarket(countryCode);
    const normalized = normalizePhoneForMarket(phone, countryCode);
    if (normalized.startsWith(market.phoneCountryCode)) {
        return normalized.slice(market.phoneCountryCode.length);
    }
    return phone.replace(/\s+/g, '');
}
