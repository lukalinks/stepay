import bcrypt from 'bcrypt';
import { sql } from '@/lib/db';
import { generateConfirmCode, hashConfirmCode } from '@/lib/wallet-crypto';
import { isValidStellarPublicKey } from '@/lib/wallet-custody';

const SIGNUP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type SignupVerificationRow = {
    id: string;
    email: string;
    password_hash: string;
    country_code: string;
    confirm_code_hash: string;
    attempts: number;
    expires_at: string;
};

export async function createSignupVerification(
    email: string,
    password: string,
    countryCode: string
): Promise<{ signupId: string; confirmCode: string }> {
    const trimmed = email.trim();
    const passwordHash = await bcrypt.hash(password, 10);
    const confirmCode = generateConfirmCode();
    const salt = `${trimmed.toLowerCase()}:${Date.now()}`;
    const confirmCodeHash = `${salt}|${hashConfirmCode(confirmCode, salt)}`;
    const expiresAt = new Date(Date.now() + SIGNUP_TTL_MS).toISOString();

    await sql`
        DELETE FROM signup_verifications
        WHERE lower(trim(email)) = lower(trim(${trimmed}))
    `;

    const rows = await sql`
        INSERT INTO signup_verifications (
            email,
            password_hash,
            country_code,
            confirm_code_hash,
            expires_at
        ) VALUES (
            ${trimmed},
            ${passwordHash},
            ${countryCode},
            ${confirmCodeHash},
            ${expiresAt}
        )
        RETURNING id
    `;

    return { signupId: String((rows[0] as { id: string }).id), confirmCode };
}

export async function verifySignupAndCreateUser(
    signupId: string,
    confirmCode: string,
    walletPublic: string,
    options?: { walletBackupEnc?: string | null; cloudBackupEnabled?: boolean }
): Promise<{ userId: string; email: string }> {
    const publicKey = walletPublic.trim();
    if (!isValidStellarPublicKey(publicKey)) {
        throw new Error('A valid Stellar wallet public key is required.');
    }

    const normalizedCode = confirmCode.replace(/\D/g, '');
    if (normalizedCode.length !== 6) {
        throw new Error('Please enter the 6-digit verification code.');
    }

    return sql.begin(async (tx) => {
        const rows = await tx`
            SELECT * FROM signup_verifications
            WHERE id = ${signupId}
            FOR UPDATE
        `;
        const row = rows[0] as SignupVerificationRow | undefined;
        if (!row) {
            throw new Error('Verification request not found. Please start signup again.');
        }

        if (new Date(row.expires_at).getTime() < Date.now()) {
            await tx`DELETE FROM signup_verifications WHERE id = ${signupId}`;
            throw new Error('Verification code expired. Please request a new code.');
        }

        const [salt, expectedHash] = row.confirm_code_hash.split('|');
        if (!salt || !expectedHash) {
            throw new Error('Invalid verification state. Please start signup again.');
        }

        const actualHash = hashConfirmCode(normalizedCode, salt);
        if (actualHash !== expectedHash) {
            const attempts = Number(row.attempts) + 1;
            if (attempts >= MAX_ATTEMPTS) {
                await tx`DELETE FROM signup_verifications WHERE id = ${signupId}`;
                throw new Error('Too many incorrect codes. Please start signup again.');
            }
            await tx`
                UPDATE signup_verifications SET attempts = ${attempts}
                WHERE id = ${signupId}
            `;
            throw new Error('Incorrect verification code.');
        }

        const trimmedEmail = row.email.trim();

        const existingEmail = await tx`
            SELECT id FROM users WHERE lower(trim(email)) = lower(${trimmedEmail}) LIMIT 1
        `;
        if (existingEmail.length) {
            await tx`DELETE FROM signup_verifications WHERE id = ${signupId}`;
            throw new Error('An account with this email already exists. Try signing in.');
        }

        const existingWallet = await tx`
            SELECT id FROM users WHERE wallet_public = ${publicKey} LIMIT 1
        `;
        if (existingWallet.length) {
            throw new Error('This wallet is already linked to another account.');
        }

        const cloudBackupEnabled = options?.cloudBackupEnabled !== false;
        const backupEnc = cloudBackupEnabled && options?.walletBackupEnc?.trim() ? options.walletBackupEnc.trim() : null;

        const inserted = await tx`
            INSERT INTO users (
                email,
                phone_number,
                pin_hash,
                password_hash,
                wallet_public,
                wallet_secret,
                wallet_secret_enc,
                wallet_backup_enc,
                wallet_backup_enabled,
                country_code
            ) VALUES (
                ${trimmedEmail},
                null,
                ${'password-auth'},
                ${row.password_hash},
                ${publicKey},
                null,
                null,
                ${backupEnc},
                ${cloudBackupEnabled},
                ${row.country_code}
            )
            RETURNING id, email
        `;
        const user = inserted[0] as { id: string; email: string | null } | undefined;
        if (!user) {
            throw new Error('Could not create your account. Please try again.');
        }

        await tx`DELETE FROM signup_verifications WHERE id = ${signupId}`;

        return { userId: user.id, email: user.email ?? trimmedEmail };
    });
}
