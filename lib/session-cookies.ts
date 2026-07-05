import { NextResponse } from 'next/server';
import {
    authCookieDomain,
    authSessionCookieName,
    authUseSecureCookies,
    buildSessionCookieOptions,
    clearSessionCookieOptions,
} from '@/lib/issue-jwt';

/** Non-prefixed cookie name when production uses __Secure- (and vice versa). */
export function alternateSessionCookieName(): string {
    const secure = authUseSecureCookies();
    return secure ? 'authjs.session-token' : '__Secure-authjs.session-token';
}

export function allSessionCookieNames(): string[] {
    const primary = authSessionCookieName();
    const alt = alternateSessionCookieName();
    return primary === alt ? [primary] : [primary, alt];
}

function domainVariants(): (string | undefined)[] {
    const configured = authCookieDomain();
    const variants: (string | undefined)[] = [undefined];
    if (!configured) return variants;
    variants.push(configured);
    const bare = configured.startsWith('.') ? configured.slice(1) : configured;
    if (bare !== configured) variants.push(bare);
    return variants;
}

/** Expire every known session cookie variant (name × domain). */
export function clearAllSessionCookies(response: NextResponse): void {
    const base = clearSessionCookieOptions();
    const { domain: _ignored, ...hostOnly } = base;

    for (const name of allSessionCookieNames()) {
        for (const domain of domainVariants()) {
            if (domain === undefined) {
                response.cookies.set(name, '', hostOnly);
            } else {
                response.cookies.set(name, '', { ...hostOnly, domain });
            }
        }
    }
}

/** Replace any prior session with a single canonical cookie. */
export function setSessionCookie(response: NextResponse, token: string): void {
    clearAllSessionCookies(response);
    response.cookies.set(authSessionCookieName(), token, buildSessionCookieOptions());
}
