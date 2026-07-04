import { getToken } from 'next-auth/jwt';
import { auth } from '@/auth';
import { authJwtSalt, authSessionCookieName, authUseSecureCookies } from '@/lib/issue-jwt';

/**
 * Resolves the Stepay user ID from the request.
 * - Cookie session (Auth.js JWT) — same path as middleware via auth()
 * - Mobile: Authorization: Bearer <Auth.js session JWT>
 */
export async function getUserIdFromRequest(request: Request): Promise<string | null> {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        return null;
    }

    try {
        const session = await auth();
        const sessionUserId = session?.user?.id;
        if (typeof sessionUserId === 'string' && sessionUserId.length > 0) {
            return sessionUserId;
        }
    } catch {
        // fall through to Bearer / getToken
    }

    const secure = authUseSecureCookies();
    const salt = authJwtSalt();
    const cookieName = authSessionCookieName();

    const token = await getToken({
        req: request,
        secret,
        secureCookie: secure,
        salt,
        cookieName,
    });

    const sub = token?.sub;
    if (typeof sub === 'string' && sub.length > 0) {
        return sub;
    }

    return null;
}
