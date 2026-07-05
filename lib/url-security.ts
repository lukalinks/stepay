import { isIP } from 'node:net';
import { MAIN_HOST } from '@/lib/hosts';

const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'metadata.google.internal',
    'metadata.goog',
]);

function isLocalDevHostname(hostname: string): boolean {
    const h = hostname.toLowerCase();
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1';
}

function isPrivateOrReservedIp(hostname: string): boolean {
    const ipVersion = isIP(hostname);
    if (ipVersion === 4) {
        const parts = hostname.split('.').map(Number);
        const [a, b] = parts;
        if (a === 10) return true;
        if (a === 127) return true;
        if (a === 0) return true;
        if (a === 169 && b === 254) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
        if (a === 192 && b === 168) return true;
        if (a === 100 && b >= 64 && b <= 127) return true;
        return false;
    }
    if (ipVersion === 6) {
        const h = hostname.toLowerCase();
        if (h === '::1' || h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return true;
    }
    return false;
}

function assertPublicHostname(hostname: string): void {
    const h = hostname.toLowerCase().replace(/\.$/, '');
    if (BLOCKED_HOSTNAMES.has(h)) {
        throw new Error('URL hostname is not allowed.');
    }
    if (h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.localhost')) {
        throw new Error('URL hostname is not allowed.');
    }
    if (isPrivateOrReservedIp(h)) {
        throw new Error('URL must not point to a private or internal address.');
    }
}

function parseHttpUrl(raw: string, label: string): URL {
    let parsed: URL;
    try {
        parsed = new URL(raw.trim());
    } catch {
        throw new Error(`${label} is not a valid URL.`);
    }
    if (parsed.username || parsed.password) {
        throw new Error(`${label} must not include credentials.`);
    }
    return parsed;
}

/** Merchant success/cancel redirects shown to payers after checkout. */
export function assertSafeRedirectUrl(raw: string | null | undefined): string | null {
    if (!raw?.trim()) return null;

    const parsed = parseHttpUrl(raw, 'Redirect URL');
    const isDev = process.env.NODE_ENV !== 'production';
    const host = parsed.hostname.toLowerCase();

    if (parsed.protocol === 'https:') {
        assertPublicHostname(host);
        return parsed.toString();
    }

    if (isDev && parsed.protocol === 'http:' && isLocalDevHostname(host)) {
        return parsed.toString();
    }

    throw new Error('Redirect URL must use HTTPS.');
}

/** Outbound merchant webhooks — HTTPS public hosts only (blocks SSRF). */
export function assertSafeWebhookUrl(raw: string | null | undefined): string | null {
    if (!raw?.trim()) return null;

    const parsed = parseHttpUrl(raw, 'Webhook URL');
    const host = parsed.hostname.toLowerCase();

    if (parsed.protocol !== 'https:') {
        throw new Error('Webhook URL must use HTTPS.');
    }

    assertPublicHostname(host);
    return parsed.toString();
}

/** Filter success/cancel URLs returned to payers — HTTPS public URLs only. */
export function sanitizeRedirectUrlForClient(raw: string | null | undefined): string | null {
    if (!raw?.trim()) return null;
    try {
        const parsed = new URL(raw.trim());
        const host = parsed.hostname.toLowerCase();
        const stepayHosts = new Set([MAIN_HOST, `www.${MAIN_HOST}`, 'localhost', '127.0.0.1']);
        if (parsed.protocol === 'https:' && (stepayHosts.has(host) || !isPrivateOrReservedIp(host))) {
            if (!BLOCKED_HOSTNAMES.has(host) && !host.endsWith('.local')) {
                return parsed.toString();
            }
        }
    } catch {
        // drop unsafe URLs
    }
    return null;
}
