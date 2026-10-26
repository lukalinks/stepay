import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import authConfig from '@/auth.config';
import {
    adminBaseUrl,
    isAdminHost,
    isAltMainHost,
    mainBaseUrl,
    mainDashboardUrl,
    MAIN_HOST,
    normalizeHost,
    requiresCanonicalHost,
} from '@/lib/hosts';

/** Edge-safe: do not import `@/auth` here — it pulls bcrypt/postgres via Credentials. */
const { auth } = NextAuth(authConfig);

function requestBaseUrl(request: { headers: Headers; nextUrl: { origin: string } }): string {
    const host =
        request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
        request.headers.get('host')?.split(',')[0]?.trim();
    if (!host) return request.nextUrl.origin;
    const proto =
        request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
        (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
    return `${proto}://${host}`;
}

/** Strip www so cookies + auth stay on one host (www had host-only CSRF cookies). */
function wwwToApexUrl(request: { headers: Headers; nextUrl: { pathname: string; search: string } }): URL | null {
    const host = normalizeHost(
        request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
            request.headers.get('host')?.split(',')[0]?.trim()
    );
    if (!host.startsWith('www.')) return null;
    const apex = host.slice(4);
    if (!apex) return null;
    // Keep admin / alt marketing hosts on their apex; never invent new hosts.
    if (apex !== MAIN_HOST && !isAltMainHost(apex) && !isAdminHost(apex)) return null;
    const proto =
        request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
        (host.startsWith('localhost') ? 'http' : 'https');
    return new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, `${proto}://${apex}`);
}

function corsHeaders(request: Request): Record<string, string> {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
        process.env.AUTH_URL?.replace(/\/$/, ''),
        process.env.ADMIN_URL?.replace(/\/$/, ''),
        ...((process.env.ALT_HOSTS || 'getstepay.com')
            .split(',')
            .map((h) => h.trim().toLowerCase())
            .filter(Boolean)
            .flatMap((h) => [`https://${h}`, `https://www.${h}`])),
    ].filter(Boolean) as string[];

    let allowOrigin = '*';
    if (process.env.NODE_ENV === 'production') {
        allowOrigin =
            origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '';
    } else if (origin) {
        allowOrigin = origin;
    }

    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Client, X-Stepay-Key',
        ...(allowOrigin !== '*' ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
    };
}

const EMBED_CHECKOUT_CSP =
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://horizon.stellar.org https://horizon-testnet.stellar.org https://api.lenco.co https://*.lenco.co wss:; frame-src 'self' https://*.moneygram.com https://moneygram.com; frame-ancestors *; base-uri 'self'; form-action 'self'; object-src 'none'";

function applyEmbeddableCheckoutHeaders(response: NextResponse): NextResponse {
    response.headers.set('Content-Security-Policy', EMBED_CHECKOUT_CSP);
    response.headers.delete('X-Frame-Options');
    return response;
}

function isAdminSubdomainAllowedPath(pathname: string): boolean {
    return (
        pathname.startsWith('/admin') ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password') ||
        pathname.startsWith('/auth/') ||
        pathname.startsWith('/api/auth/')
    );
}

export default auth((request) => {
    const { pathname, search } = request.nextUrl;
    const host = request.headers.get('host');
    const onAdminHost = isAdminHost(host);

    const wwwDest = wwwToApexUrl(request);
    if (wwwDest) {
        return NextResponse.redirect(wwwDest, 308);
    }

    if (isAltMainHost(host) && requiresCanonicalHost(pathname)) {
        const dest = new URL(`${pathname}${search}`, mainBaseUrl());
        return NextResponse.redirect(dest, 308);
    }

    if (pathname.startsWith('/api')) {
        const headers = corsHeaders(request);
        if (request.method === 'OPTIONS') {
            return new NextResponse(null, { status: 200, headers });
        }
        const response = NextResponse.next();
        Object.entries(headers).forEach(([key, value]) => {
            if (value) response.headers.set(key, value);
        });
        return response;
    }

    if (pathname.startsWith('/pay/checkout')) {
        return applyEmbeddableCheckoutHeaders(NextResponse.next());
    }

    if (onAdminHost && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
        const origin = requestBaseUrl(request);
        if (pathname === '/') {
            return NextResponse.redirect(new URL('/admin', `${origin}/`));
        }
        if (!isAdminSubdomainAllowedPath(pathname)) {
            return NextResponse.redirect(new URL('/admin', `${origin}/`));
        }
    }

    if (
        !onAdminHost &&
        pathname.startsWith('/admin') &&
        process.env.NODE_ENV === 'production' &&
        process.env.ADMIN_URL
    ) {
        const dest = new URL(`${pathname}${search}`, adminBaseUrl());
        return NextResponse.redirect(dest, 308);
    }

    if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
        if (!request.auth) {
            const loginUrl = new URL('/login', `${requestBaseUrl(request)}/`);
            loginUrl.searchParams.set('next', pathname);
            return NextResponse.redirect(loginUrl);
        }
        if (pathname.startsWith('/admin')) {
            const role = (request.auth.user as { role?: string } | undefined)?.role;
            if (!role || !['admin', 'admin_ops', 'admin_support'].includes(role)) {
                const dest = onAdminHost ? mainDashboardUrl() : new URL('/dashboard', `${requestBaseUrl(request)}/`);
                return NextResponse.redirect(dest);
            }
        }
    }
    return NextResponse.next();
});

export const config = {
    matcher: [
        '/',
        '/login',
        '/signup',
        '/forgot-password',
        '/reset-password',
        '/profile/:path*',
        '/auth/:path*',
        '/admin/:path*',
        '/dashboard/:path*',
        '/api/:path*',
        '/pay/checkout/:path*',
    ],
};
