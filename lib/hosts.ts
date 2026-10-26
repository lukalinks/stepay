/** Production hostnames (without port). Override via env when needed. */
export const MAIN_HOST = (process.env.MAIN_HOST || 'stepay.pro').toLowerCase();
export const ADMIN_HOST = (process.env.ADMIN_HOST || 'admin.stepay.pro').toLowerCase();

/** Additional public app hostnames (comma-separated), e.g. getstepay.com */
export const ALT_HOSTS = (process.env.ALT_HOSTS || 'getstepay.com')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

export function normalizeHost(host: string | null | undefined): string {
    if (!host) return '';
    return host.split(':')[0].toLowerCase();
}

/** All hostnames that serve the main Stepay app (landing + public pages). */
export function allMainAppHosts(): string[] {
    const hosts = new Set<string>([MAIN_HOST, `www.${MAIN_HOST}`]);
    for (const alt of ALT_HOSTS) {
        hosts.add(alt);
        hosts.add(`www.${alt}`);
    }
    return [...hosts];
}

export function isMainAppHost(host: string | null | undefined): boolean {
    const h = normalizeHost(host);
    if (!h) return false;
    return allMainAppHosts().includes(h);
}

/** Alternate marketing domains — auth/dashboard runs on canonical MAIN_HOST. */
export function isAltMainHost(host: string | null | undefined): boolean {
    const h = normalizeHost(host);
    if (!h) return false;
    for (const alt of ALT_HOSTS) {
        if (h === alt || h === `www.${alt}`) return true;
    }
    return false;
}

/** Paths that require the canonical domain for shared auth cookies. */
export function requiresCanonicalHost(pathname: string): boolean {
    return (
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/signup') ||
        pathname.startsWith('/profile') ||
        pathname.startsWith('/auth/') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password')
    );
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
