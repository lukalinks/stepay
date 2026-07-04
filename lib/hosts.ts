/** Production hostnames (without port). Override via env when needed. */
export const MAIN_HOST = (process.env.MAIN_HOST || 'stepay.pro').toLowerCase();
export const ADMIN_HOST = (process.env.ADMIN_HOST || 'admin.stepay.pro').toLowerCase();

export function normalizeHost(host: string | null | undefined): string {
    if (!host) return '';
    return host.split(':')[0].toLowerCase();
}

export function adminBaseUrl(): string {
    const fromEnv = process.env.ADMIN_URL || process.env.NEXT_PUBLIC_ADMIN_URL;
    if (fromEnv) return fromEnv.replace(/\/$/, '');
    if (process.env.NODE_ENV === 'production') return `https://${ADMIN_HOST}`;
    return process.env.AUTH_URL?.replace(/\/$/, '') || 'http://localhost:3000';
}

export function mainBaseUrl(): string {
    const fromEnv = process.env.AUTH_URL || process.env.NEXT_PUBLIC_AUTH_URL;
    if (fromEnv) return fromEnv.replace(/\/$/, '');
    if (process.env.NODE_ENV === 'production') return `https://${MAIN_HOST}`;
    return 'http://localhost:3000';
}

export function isAdminHost(host: string | null | undefined): boolean {
    const h = normalizeHost(host);
    if (!h) return false;
    if (process.env.ADMIN_URL) {
        try {
            return h === new URL(process.env.ADMIN_URL).hostname.toLowerCase();
        } catch {
            // fall through
        }
    }
    return h === ADMIN_HOST || h === `www.${ADMIN_HOST}`;
}

export function adminPanelUrl(path = '/admin'): string {
    const base = adminBaseUrl();
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
}

export function mainDashboardUrl(): string {
    return `${mainBaseUrl()}/dashboard`;
}

/** Admin login email (client: NEXT_PUBLIC_ADMIN_EMAIL). */
export function adminLoginEmail(): string {
    const fromEnv = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    return (fromEnv || 'admin@stepay.pro').trim().toLowerCase();
}

export function isAdminLoginHost(host: string | null | undefined): boolean {
    return isAdminHost(host);
}
