import { encode } from '@auth/core/jwt';
import { getSessionTokenVersion } from '@/lib/session-token';

/** True only on HTTPS in production — never force secure cookies on local http://localhost. */
export function authUseSecureCookies(): boolean {
    return process.env.NODE_ENV === 'production' && process.env.AUTH_URL?.startsWith('https') === true;
}

/** Shared cookie domain for stepay.pro + admin.stepay.pro (omit on localhost). */
export function authCookieDomain(): string | undefined {
    const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();
    if (!domain) return undefined;
    return domain.startsWith('.') ? domain : `.${domain}`;
}

export function buildSessionCookieOptions(maxAge = 60 * 60 * 24 * 7) {
    const domain = authCookieDomain();
    return {
        httpOnly: true,
        secure: authUseSecureCookies(),
        sameSite: 'lax' as const,
        path: '/',
        maxAge,
        ...(domain ? { domain } : {}),
    };
}

export function clearSessionCookieOptions() {
    return { ...buildSessionCookieOptions(0), maxAge: 0 };
}

/**
 * Must match Auth.js `defaultCookies(useSecureCookies).sessionToken.name`
 * (see @auth/core/lib/utils/cookie.js — __Secure- prefix only when using HTTPS cookies).
 */
export function authSessionCookieName(): string {
    const prefix = authUseSecureCookies() ? '__Secure-' : '';
    return `${prefix}authjs.session-token`;
}

/** Salt passed to JWT encode/decode must equal the session cookie *name* (not the cookie value). */
export function authJwtSalt(): string {
    return authSessionCookieName();
}

/** Mint an Auth.js-compatible session JWT (same salt/encryption as cookie sessions). */
export async function issueAuthJwt(user: {
    id: string;
    email: string;
    role?: string;
    sessionTokenVersion?: number;
}): Promise<string> {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error('AUTH_SECRET is not set');
    }
    const tv = user.sessionTokenVersion ?? (await getSessionTokenVersion(user.id));
    const salt = authJwtSalt();
    return encode({
        token: { sub: user.id, email: user.email, role: user.role || 'user', tv },
        secret,
        salt,
        maxAge: 60 * 60 * 24 * 7,
    });
}
