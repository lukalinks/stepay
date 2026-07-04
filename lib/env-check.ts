/**
 * Dev diagnostics — validates required .env fields without exposing secret values.
 */

import { sql } from '@/lib/db';
import { diagnoseLencoSecretKey, probeLencoAuth } from '@/lib/lenco-config';

export type FieldCheck = {
    field: string;
    ok: boolean;
    hint?: string;
};

function present(name: string, value?: string | null): FieldCheck {
    const ok = Boolean(value?.trim());
    return { field: name, ok, hint: ok ? undefined : `${name} is missing or empty in .env` };
}

function looksLikeStellarSecret(value?: string | null): boolean {
    return Boolean(value?.trim().startsWith('S') && value.trim().length >= 56);
}

function looksLikeStellarPublic(value?: string | null): boolean {
    return Boolean(value?.trim().startsWith('G') && value.trim().length >= 56);
}

export async function checkAllEnvFields(): Promise<{
    fields: FieldCheck[];
    lencoAuth: Awaited<ReturnType<typeof probeLencoAuth>>;
    dbOk: boolean;
    dbError?: string;
}> {
    const fields: FieldCheck[] = [
        present('DATABASE_URL', process.env.DATABASE_URL),
        present('AUTH_SECRET', process.env.AUTH_SECRET),
        present('AUTH_URL', process.env.AUTH_URL),
        present('WALLET_ENCRYPTION_KEY', process.env.WALLET_ENCRYPTION_KEY),
        present('LENCO_ACCOUNT_ID', process.env.LENCO_ACCOUNT_ID),
        present('LENCO_API_URL', process.env.LENCO_API_URL),
        present('LENCO_PUBLIC_KEY', process.env.LENCO_PUBLIC_KEY),
        present('LENCO_SECRET_KEY', process.env.LENCO_SECRET_KEY),
        present('LENCO_WEBHOOK_SECRET', process.env.LENCO_WEBHOOK_SECRET),
        present('PLATFORM_WALLET_SECRET', process.env.PLATFORM_WALLET_SECRET),
        present('PLATFORM_WALLET_PUBLIC_KEY', process.env.PLATFORM_WALLET_PUBLIC_KEY),
    ];

    const authUrl = process.env.AUTH_URL?.trim();
    if (authUrl && process.env.NODE_ENV === 'development' && authUrl.startsWith('https://')) {
        fields.push({
            field: 'AUTH_URL (localhost)',
            ok: false,
            hint: 'Use http://localhost:3000 for local dev so session cookies work.',
        });
    } else if (authUrl) {
        fields.push({ field: 'AUTH_URL (localhost)', ok: true });
    }

    const pubKey = process.env.LENCO_PUBLIC_KEY?.trim();
    if (pubKey && !pubKey.startsWith('pub-')) {
        fields.push({
            field: 'LENCO_PUBLIC_KEY format',
            ok: false,
            hint: 'Expected Lenco public key to start with pub-',
        });
    } else if (pubKey) {
        fields.push({ field: 'LENCO_PUBLIC_KEY format', ok: true });
    }

    const secretDiagnosis = diagnoseLencoSecretKey(process.env.LENCO_SECRET_KEY);
    fields.push({
        field: 'LENCO_SECRET_KEY format',
        ok: !secretDiagnosis,
        hint: secretDiagnosis ?? undefined,
    });

    const platformSecret = process.env.PLATFORM_WALLET_SECRET;
    fields.push({
        field: 'PLATFORM_WALLET_SECRET format',
        ok: looksLikeStellarSecret(platformSecret),
        hint: looksLikeStellarSecret(platformSecret)
            ? undefined
            : 'Expected a Stellar secret key starting with S',
    });

    const platformPublic = process.env.PLATFORM_WALLET_PUBLIC_KEY;
    fields.push({
        field: 'PLATFORM_WALLET_PUBLIC_KEY format',
        ok: looksLikeStellarPublic(platformPublic),
        hint: looksLikeStellarPublic(platformPublic)
            ? undefined
            : 'Expected a Stellar public key starting with G',
    });

    let dbOk = false;
    let dbError: string | undefined;
    try {
        await sql`SELECT 1 AS ok`;
        dbOk = true;
        fields.push({ field: 'Database connection', ok: true });
    } catch (err) {
        dbError = err instanceof Error ? err.message : 'Database unreachable';
        fields.push({ field: 'Database connection', ok: false, hint: dbError });
    }

    const lencoAuth = await probeLencoAuth();

    return { fields, lencoAuth, dbOk, dbError };
}
