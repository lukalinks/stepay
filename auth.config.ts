import type { NextAuthConfig } from 'next-auth';
import { authCookieDomain, authSessionCookieName, authUseSecureCookies } from '@/lib/issue-jwt';

const cookieDomain = authCookieDomain();

/**
 * Shared Auth.js config safe for Edge (middleware). No DB/bcrypt — those stay in `auth.ts`.
 */
export default {
    trustHost: true,
    useSecureCookies: authUseSecureCookies(),
    cookies: {
        sessionToken: {
            name: authSessionCookieName(),
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: authUseSecureCookies(),
                ...(cookieDomain ? { domain: cookieDomain } : {}),
            },
        },
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
                const u = user as { role?: string };
                if (u.role) {
                    token.role = u.role;
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
