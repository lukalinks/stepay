import bcrypt from 'bcrypt';
import { sql } from '@/lib/db';

/** Used by Credentials provider and `/api/auth/login` (avoids importing full NextAuth in API routes). */
export async function verifyUserCredentials(
    emailRaw: string,
    password: string
): Promise<{ id: string; email: string; role: string; sessionTokenVersion: number } | null> {
    const email = emailRaw.trim();
    if (!email || !password) {
        return null;
    }

    const rows = await sql`
        SELECT id, email, password_hash, role, session_token_version FROM users
        WHERE lower(trim(email)) = lower(${email})
        LIMIT 1
    `;
    const row = rows[0] as {
        id: string;
        email: string | null;
        password_hash: string | null;
        role?: string | null;
        session_token_version?: number | null;
    } | undefined;
    if (!row?.password_hash) {
        return null;
    }

    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) {
        return null;
    }

    return {
        id: row.id,
        email: row.email ?? email,
        role: row.role || 'user',
        sessionTokenVersion: Number(row.session_token_version ?? 0),
    };
}
