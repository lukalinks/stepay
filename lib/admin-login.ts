import { sql } from '@/lib/db';
import { generateConfirmCode, hashConfirmCode } from '@/lib/wallet-crypto';

const LOGIN_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type AdminLoginRow = {
    id: string;
    user_id: string;
    email: string;
    confirm_code_hash: string;
    attempts: number;
    expires_at: string;
};

export function adminLoginEmail(): string {
    return (process.env.ADMIN_EMAIL || 'admin@stepay.pro').trim().toLowerCase();
}

export function isAdminLoginEmail(email: string): boolean {
    return email.trim().toLowerCase() === adminLoginEmail();
}

export async function createAdminLoginVerification(
    emailRaw: string
): Promise<{ loginId: string; confirmCode: string } | null> {
    const email = emailRaw.trim();
    if (!isAdminLoginEmail(email)) {
        return null;
    }

    const rows = await sql`
        SELECT id, email, role FROM users
        WHERE lower(trim(email)) = lower(${email})
        LIMIT 1
    `;
    const user = rows[0] as { id: string; email: string | null; role?: string | null } | undefined;
    if (!user || user.role !== 'admin') {
        return null;
    }

    const confirmCode = generateConfirmCode();
    const salt = `${email.toLowerCase()}:${Date.now()}`;
    const confirmCodeHash = `${salt}|${hashConfirmCode(confirmCode, salt)}`;
    const expiresAt = new Date(Date.now() + LOGIN_TTL_MS).toISOString();

    await sql`
        DELETE FROM admin_login_verifications
        WHERE user_id = ${user.id}
    `;

    const inserted = await sql`
        INSERT INTO admin_login_verifications (
            user_id,
            email,
            confirm_code_hash,
            expires_at
        ) VALUES (
            ${user.id},
            ${email},
            ${confirmCodeHash},
            ${expiresAt}
        )
        RETURNING id
    `;

    return {
        loginId: String((inserted[0] as { id: string }).id),
        confirmCode,
    };
}

export async function verifyAdminLogin(
    loginId: string,
    confirmCode: string
): Promise<{ id: string; email: string; role: string }> {
    const normalizedCode = confirmCode.replace(/\D/g, '');
    if (normalizedCode.length !== 6) {
        throw new Error('Please enter the 6-digit verification code.');
    }

    return sql.begin(async (tx) => {
        const rows = await tx`
            SELECT v.*, u.role AS user_role
            FROM admin_login_verifications v
            JOIN users u ON u.id = v.user_id
            WHERE v.id = ${loginId}
            FOR UPDATE OF v
        `;
        const row = rows[0] as (AdminLoginRow & { user_role: string | null }) | undefined;
        if (!row) {
            throw new Error('Login session expired. Please request a new code.');
        }

        if (new Date(row.expires_at).getTime() < Date.now()) {
            await tx`DELETE FROM admin_login_verifications WHERE id = ${loginId}`;
            throw new Error('Verification code expired. Please request a new code.');
        }

        if (row.user_role !== 'admin') {
            await tx`DELETE FROM admin_login_verifications WHERE id = ${loginId}`;
            throw new Error('This account cannot use admin login.');
        }

        const [salt, expectedHash] = row.confirm_code_hash.split('|');
        if (!salt || !expectedHash) {
            throw new Error('Invalid login state. Please request a new code.');
        }

        const actualHash = hashConfirmCode(normalizedCode, salt);
        if (actualHash !== expectedHash) {
            const attempts = Number(row.attempts) + 1;
            if (attempts >= MAX_ATTEMPTS) {
                await tx`DELETE FROM admin_login_verifications WHERE id = ${loginId}`;
                throw new Error('Too many incorrect codes. Please request a new code.');
            }
            await tx`
                UPDATE admin_login_verifications SET attempts = ${attempts}
                WHERE id = ${loginId}
            `;
            throw new Error('Incorrect verification code.');
        }

        await tx`DELETE FROM admin_login_verifications WHERE id = ${loginId}`;

        return {
            id: row.user_id,
            email: row.email,
            role: 'admin',
        };
    });
}
