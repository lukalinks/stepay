import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { StellarService } from '@/lib/stellar';
import { cookies } from 'next/headers';

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

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json({ error: 'Auth is not configured' }, { status: 500 });
        }

        const authClient = createClient(supabaseUrl, supabaseAnonKey);

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
        console.error('Login Error:', err);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
