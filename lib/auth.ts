import { decode } from '@auth/core/jwt';
import { getToken } from 'next-auth/jwt';
import { authSessionCookieName, authUseSecureCookies } from '@/lib/issue-jwt';
import { parseCookieValues } from '@/lib/parse-cookies';
import { allSessionCookieNames } from '@/lib/session-cookies';
import { isSessionTokenVersionValid } from '@/lib/session-token';

async function resolveUserIdFromSessionPayload(
    sub: unknown,
    tv: unknown
): Promise<string | null> {
    if (typeof sub !== 'string' || sub.length === 0) return null;
    const valid = await isSessionTokenVersionValid(sub, tv);
    return valid ? sub : null;
}

/**
 * Resolves the Stepay user ID from the request.
 * - Cookie session (Auth.js JWT) — scans all session cookie variants
 * - Mobile: Authorization: Bearer <Auth.js session JWT>
 */
export async function getUserIdFromRequest(request: Request): Promise<string | null> {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        return null;
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const raw = authHeader.slice(7).trim();
        if (raw) {
            for (const name of allSessionCookieNames()) {
                try {
                    const payload = await decode({ token: raw, secret, salt: name });
                    const userId = await resolveUserIdFromSessionPayload(payload?.sub, payload?.tv);
                    if (userId) return userId;
                } catch {
                    // try next salt / cookie name
                }
            }
        }
    }

    const cookieHeader = request.headers.get('cookie');
    const names = allSessionCookieNames();
    const ordered = [authSessionCookieName(), ...names.filter((n) => n !== authSessionCookieName())];

    const matchedUserIds = new Set<string>();
    for (const name of ordered) {
        for (const raw of parseCookieValues(cookieHeader, name)) {
            try {
                const payload = await decode({ token: raw, secret, salt: name });
                const userId = await resolveUserIdFromSessionPayload(payload?.sub, payload?.tv);
                if (userId) matchedUserIds.add(userId);
            } catch {
                // stale or wrong salt
            }
        }
    }

    if (matchedUserIds.size > 1) {
        // Stale duplicate cookies from a prior account — treat as logged out.
        return null;
    }
    if (matchedUserIds.size === 1) {
        return [...matchedUserIds][0]!;
    }

    const secure = authUseSecureCookies();
    const token = await getToken({
        req: request,
        secret,
        secureCookie: secure,
        salt: authSessionCookieName(),
        cookieName: authSessionCookieName(),
    });

    return resolveUserIdFromSessionPayload(token?.sub, token?.tv);
}
