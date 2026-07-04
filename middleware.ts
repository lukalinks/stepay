import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import authConfig from '@/auth.config';
import { adminBaseUrl, isAdminHost, mainDashboardUrl } from '@/lib/hosts';

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

function corsHeaders(request: Request): Record<string, string> {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
        process.env.AUTH_URL?.replace(/\/$/, ''),
        process.env.ADMIN_URL?.replace(/\/$/, ''),
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

function isAdminSubdomainAllowedPath(pathname: string): boolean {
    return (
        pathname.startsWith('/admin') ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/auth/') ||
        pathname.startsWith('/api/auth/')
    );
}

export default auth((request) => {
    const { pathname, search } = request.nextUrl;
    const host = request.headers.get('host');
    const onAdminHost = isAdminHost(host);

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
            if (role !== 'admin') {
                const dest = onAdminHost ? mainDashboardUrl() : new URL('/dashboard', `${requestBaseUrl(request)}/`);
                return NextResponse.redirect(dest);
            }
        }
    }
    return NextResponse.next();
});

export const config = {
    matcher: ['/', '/login', '/admin/:path*', '/dashboard/:path*', '/api/:path*'],
};
