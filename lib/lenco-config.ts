/**
 * Lenco API token validation and phone formatting.
 * Docs: https://lenco-api.readme.io/v2.0/reference/get-started
 */

import { normalizeZambianPhone } from '@/lib/phone';

/** Non-blocking hints for /api/dev/check only. */
export function lencoSecretKeyHint(key?: string | null): string | null {
    const trimmed = key?.trim();
    if (!trimmed) return 'LENCO_SECRET_KEY is not set in .env.';
    if (trimmed.startsWith('pub-')) {
        return 'LENCO_PUBLIC_KEY and LENCO_SECRET_KEY may be swapped — secret should not start with pub-.';
    }
    return null;
}

/** Hard validation before calling Lenco — only block clearly wrong values. */
export function diagnoseLencoSecretKey(key?: string | null): string | null {
    const trimmed = key?.trim();
    if (!trimmed) {
        return 'LENCO_SECRET_KEY is not set in .env.';
    }
    if (trimmed.startsWith('pub-')) {
        return 'LENCO_SECRET_KEY is set to your public key. Use the secret API token from Lenco Pay → APIs.';
    }
    return null;
}

/** Lenco collections expect local format e.g. 0971234567 (see API response samples). */
export function formatPhoneForLenco(phone: string): string {
    const normalized = normalizeZambianPhone(phone);
    const local = normalized.startsWith('260') ? normalized.slice(3) : normalized;
    return local.startsWith('0') ? local : `0${local}`;
}

const OPERATOR_PREFIXES: Record<string, string[]> = {
    mtn: ['096', '076'],
    airtel: ['097', '077'],
    zamtel: ['095', '075'],
};

/** Soft check — Zambian numbers usually start with operator-specific prefixes. */
export function zambianOperatorMatchesPhone(operator: string, phone: string): boolean {
    const local = formatPhoneForLenco(phone).replace(/\D/g, '');
    const prefixes = OPERATOR_PREFIXES[operator.toLowerCase()];
    if (!prefixes || local.length < 3) return true;
    return prefixes.some((p) => local.startsWith(p));
}

export function mapLencoCollectionError(message: string, errorCode?: string, operator?: string): string {
    const lower = message.toLowerCase();
    if (
        errorCode === '10' ||
        lower.includes('account details was not found') ||
        lower.includes('account details not found')
    ) {
        const network = operator ? operator.toUpperCase() : 'selected network';
        return `No mobile money wallet found for this number on ${network}. Check the phone number and that you picked the correct network (MTN 096/076, Airtel 097/077, Zamtel 095/075).`;
    }
    if (lower.includes('duplicate') && lower.includes('reference')) {
        return 'This deposit reference was already used. Please try again.';
    }
    return message;
}

export async function probeLencoAuth(): Promise<{
    ok: boolean;
    status: number;
    errorCode?: string;
    message?: string;
    secretDiagnosis: string | null;
}> {
    const key = process.env.LENCO_SECRET_KEY?.trim();
    const diagnosis = lencoSecretKeyHint(key);
    const url = `${(process.env.LENCO_API_URL || 'https://api.lenco.co/access/v2').trim()}/accounts`;

    if (!key) {
        return { ok: false, status: 0, message: 'No secret key', secretDiagnosis: diagnosis };
    }

    try {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
        });
        const body = await res.json().catch(() => ({}));
        const ok = res.ok && body?.status !== false;
        return {
            ok,
            status: res.status,
            errorCode: body?.errorCode ? String(body.errorCode) : undefined,
            message: body?.message ? String(body.message) : undefined,
            secretDiagnosis: diagnosis,
        };
    } catch (err) {
        return {
            ok: false,
            status: 0,
            message: err instanceof Error ? err.message : 'Network error',
            secretDiagnosis: diagnosis,
        };
    }
}
