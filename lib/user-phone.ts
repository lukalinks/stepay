import { sql } from '@/lib/db';
import { normalizePhoneForMarket } from '@/lib/phone';

export async function isPhoneUsedByOtherUser(userId: string, phone: string): Promise<boolean> {
    const rows = await sql`
        SELECT id FROM users
        WHERE phone_number = ${phone} AND id != ${userId}
        LIMIT 1
    `;
    return rows.length > 0;
}

/** Save deposit phone when free; always updates preferred operator. Never throws on duplicate. */
export async function saveDepositPhoneDetails(
    userId: string,
    phone: string,
    operator: string,
    countryCode?: string | null
): Promise<{ phoneSaved: boolean }> {
    const taken = await isPhoneUsedByOtherUser(userId, phone);
    if (taken) {
        await sql`
            UPDATE users SET preferred_operator = ${operator}, updated_at = NOW()
            WHERE id = ${userId}
        `;
        return { phoneSaved: false };
    }

    const phoneNormalized = normalizePhoneForMarket(phone, countryCode);
    await sql`
        UPDATE users SET
            preferred_operator = ${operator},
            phone_number = ${phone},
            phone_normalized = ${phoneNormalized},
            updated_at = NOW()
        WHERE id = ${userId}
    `;
    return { phoneSaved: true };
}

export function isUniquePhoneViolation(error: unknown): boolean {
    const err = error as { code?: string; constraint?: string };
    return err?.code === '23505' && String(err?.constraint ?? '').includes('phone_number');
}
