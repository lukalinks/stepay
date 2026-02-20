import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseClientConfig } from '@/lib/supabase-client';
import { createOrGetAppUser } from '@/lib/auth';

export async function GET() {
    return NextResponse.json({ message: 'Use POST with { email, password } to log in.' });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        const trimmed = typeof email === 'string' ? email.trim() : '';
        const pwd = typeof password === 'string' ? password : '';
        if (!trimmed || !trimmed.includes('@')) {
            return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
        }
        if (!pwd || pwd.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        const config = getSupabaseClientConfig();
        if (!config) {
            return NextResponse.json({ error: 'Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel env vars.' }, { status: 500 });
        }
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
        if (!serviceKey || serviceKey === 'placeholder-key-for-build') {
            return NextResponse.json({ error: 'Server auth not configured. Add SUPABASE_SERVICE_ROLE_KEY to Vercel env vars (Settings → Environment Variables).' }, { status: 500 });
        }

        const authClient = createClient(config.url, config.anonKey);

        const { data: { user: authUser, session }, error } = await authClient.auth.signInWithPassword({
            email: trimmed,
            password: pwd,
        });

        if (error) {
            if (error.message === 'Invalid login credentials') {
                return NextResponse.json({ error: 'Invalid email or password. Don\'t have an account? Sign up first.' }, { status: 401 });
            }
            if (error.message?.toLowerCase().includes('email not confirmed')) {
                return NextResponse.json({ error: 'Email not confirmed. Check your inbox for a confirmation link, then try again.' }, { status: 401 });
            }
            return NextResponse.json({ error: error.message || 'Login failed' }, { status: 400 });
        }

        if (!authUser?.email) {
            return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
        }

        const userId = await createOrGetAppUser(authUser);
        if (!userId) {
            return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
        }

        let isMobile = false;
        try {
            const url = new URL(request.url);
            isMobile = url.searchParams.get('client') === 'mobile';
        } catch {
            // request.url may be relative in some environments
        }

        if (!isMobile) {
            const cookieStore = await cookies();
            cookieStore.set('stepay_user', userId, {
                httpOnly: true,
                path: '/',
                maxAge: 60 * 60 * 24 * 7,
            });
        }

        const payload: { success: boolean; accessToken?: string; refreshToken?: string } = { success: true };
        if (isMobile && session?.access_token && session?.refresh_token) {
            payload.accessToken = session.access_token;
            payload.refreshToken = session.refresh_token;
        }

        return NextResponse.json(payload);
    } catch (err) {
        let message = 'Login failed';
        if (err instanceof Error) {
            message = err.message;
        } else if (err && typeof err === 'object') {
            const o = err as { message?: string; error?: string };
            message = o.message || o.error || JSON.stringify(err).slice(0, 300) || message;
        } else if (err != null) {
            message = String(err);
        }
        console.error('Login Error:', err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
