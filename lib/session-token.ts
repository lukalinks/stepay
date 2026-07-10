import { sql } from '@/lib/db';

export async function getSessionTokenVersion(userId: string): Promise<number> {
    const rows = await sql`
        SELECT session_token_version FROM users WHERE id = ${userId} LIMIT 1
    `;
    return Number((rows[0] as { session_token_version?: number } | undefined)?.session_token_version ?? 0);
}

/** Invalidate all existing JWTs/cookies for a user (password reset, etc.). */
export async function incrementSessionTokenVersion(userId: string): Promise<number> {
    const rows = await sql`
        UPDATE users
        SET session_token_version = COALESCE(session_token_version, 0) + 1
        WHERE id = ${userId}
        RETURNING session_token_version
    `;
    return Number((rows[0] as { session_token_version?: number } | undefined)?.session_token_version ?? 1);
}

export async function isSessionTokenVersionValid(userId: string, tokenVersion: unknown): Promise<boolean> {
    const expected = await getSessionTokenVersion(userId);
    const tv = typeof tokenVersion === 'number' ? tokenVersion : 0;
    return tv === expected;
}
