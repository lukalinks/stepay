import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { StellarService } from '@/lib/stellar';
import { cookies } from 'next/headers';
import { getSupabaseClientConfig } from '@/lib/supabase-client';

export async function GET() {
    return NextResponse.json({ message: 'Use POST with { email, password } to log in.' });
}

async function createOrGetAppUser(authUser: { id: string; email?: string | null }) {
    const email = authUser.email;
    if (!email) return null;

    let { data: appUser } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .single();

    if (!appUser) {
        const { data: byEmail } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (byEmail) {
            await supabase.from('users').update({ auth_id: authUser.id }).eq('id', byEmail.id);
            appUser = { ...byEmail, auth_id: authUser.id };
        } else {
            const keypair = StellarService.generateAccount();
            const { data: newUser, error } = await supabase
                .from('users')
                .insert({
                    email,
                    auth_id: authUser.id,
                    phone_number: null,
                    pin_hash: 'password-auth',
                    wallet_public: keypair.publicKey,
                    wallet_secret: keypair.secretKey,
                })
                .select()
                .single();

            if (error) throw error;
            appUser = newUser;
        }
    }
    return appUser;
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

        const { data: { user: authUser }, error } = await authClient.auth.signInWithPassword({
            email: trimmed,
            password: pwd,
        });

        if (error) {
            if (error.message === 'Invalid login credentials') {
                return NextResponse.json({ error: 'Invalid email or password. Don\'t have an account? Sign up first.' }, { status: 401 });
            }
            return NextResponse.json({ error: error.message || 'Login failed' }, { status: 400 });
        }

        if (!authUser?.email) {
            return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
        }

        const appUser = await createOrGetAppUser(authUser);
        if (!appUser) {
            return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
        }

        const cookieStore = await cookies();
        cookieStore.set('stepay_user', appUser.id, {
            httpOnly: true,
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
        });

        return NextResponse.json({ success: true });
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
