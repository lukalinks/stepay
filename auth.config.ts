import type { NextAuthConfig } from 'next-auth';
import { authCookieDomain, authSessionCookieName, authUseSecureCookies } from '@/lib/issue-jwt';

const cookieDomain = authCookieDomain();
const secure = authUseSecureCookies();

/** When sharing cookies across apex/www/admin, never use __Host- (forbids Domain). */
function sharedCookie(name: string) {
    return {
        name,
        options: {
            httpOnly: true,
            sameSite: 'lax' as const,
            path: '/',
            secure,
            ...(cookieDomain ? { domain: cookieDomain } : {}),
        },
    };
}

/**
 * Shared Auth.js config safe for Edge (middleware). No DB/bcrypt — those stay in `auth.ts`.
 */
export default {
    trustHost: true,
    useSecureCookies: secure,
    cookies: {
        sessionToken: sharedCookie(authSessionCookieName()),
        // Defaults use __Host- which breaks login across www/apex/admin when AUTH_COOKIE_DOMAIN is set.
        csrfToken: sharedCookie(secure ? '__Secure-authjs.csrf-token' : 'authjs.csrf-token'),
        callbackUrl: sharedCookie(secure ? '__Secure-authjs.callback-url' : 'authjs.callback-url'),
    },
    providers: [],
    session: {
        strategy: 'jwt',
        maxAge: 60 * 60 * 24 * 7,
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
                if (user.email) {
                    token.email = user.email;
                }
                const u = user as { role?: string; sessionTokenVersion?: number };
                if (u.role) {
                    token.role = u.role;
                }
                if (typeof u.sessionTokenVersion === 'number') {
                    token.tv = u.sessionTokenVersion;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub as string;
                session.user.email = (token.email as string) ?? session.user.email;
                session.user.role = (token.role as string) || 'user';
            }
            return session;
        },
    },
} satisfies NextAuthConfig;
