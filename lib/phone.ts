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
    return normalizeZambianPhone(a) === normalizeZambianPhone(b);
}

export function normalizePhoneForMarket(phone: string, countryCode?: string | null): string {
    const market = getMarket(countryCode);
    if (market.countryCode === 'ZM') return normalizeZambianPhone(phone);
    throw new Error('Phone normalization is not configured for this country yet.');
}

export function isValidPhoneForMarket(phone: string, countryCode?: string | null): boolean {
    const market = getMarket(countryCode);
    if (market.countryCode === 'ZM') return isValidZambianPhone(phone);
    return false;
}

export function formatPhoneE164ForMarket(phone: string, countryCode?: string | null): string {
    const market = getMarket(countryCode);
    if (market.countryCode === 'ZM') return formatZambianPhoneE164(phone);
    throw new Error('Enter a valid mobile money number for your country.');
}

export function localPhoneDisplayForMarket(phone: string, countryCode?: string | null): string {
    const market = getMarket(countryCode);
    if (market.countryCode === 'ZM') return localPhoneDisplay(phone);
    return phone.replace(/\s+/g, '');
}
