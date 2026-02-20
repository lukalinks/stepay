import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseClientConfig } from '@/lib/supabase-client';
import { createOrGetAppUser } from '@/lib/auth';

export async function GET() {
    return NextResponse.json({ message: 'Use POST with { email, password } to sign up.' });
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
            return NextResponse.json({ error: 'Server auth not configured. Add SUPABASE_SERVICE_ROLE_KEY to Vercel env vars.' }, { status: 500 });
        }

        const authClient = createClient(config.url, config.anonKey);

        const { data: { user: authUser, session }, error } = await authClient.auth.signUp({
            email: trimmed,
            password: pwd,
            options: { emailRedirectTo: undefined },
        });

        if (error) {
            if (error.message?.includes('already registered')) {
                return NextResponse.json({ error: 'An account with this email already exists. Try signing in.' }, { status: 400 });
            }
            return NextResponse.json({ error: error.message || 'Sign up failed' }, { status: 400 });
        }

        if (!authUser?.email) {
            return NextResponse.json({ error: 'Sign up failed' }, { status: 500 });
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
        console.error('Sign up Error:', err);
        return NextResponse.json({ error: 'Sign up failed' }, { status: 500 });
    }
}
