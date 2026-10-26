import { sql } from './db';
import { getMarket, normalizeCountryCode } from './markets';

export async function getUserCountryCode(userId: string): Promise<string> {
    const rows = await sql`
        SELECT country_code FROM users WHERE id = ${userId} LIMIT 1
    `;
    return normalizeCountryCode(rows[0]?.country_code as string | undefined);
}

export async function getUserMarket(userId: string) {
    const countryCode = await getUserCountryCode(userId);
    return getMarket(countryCode);
}
