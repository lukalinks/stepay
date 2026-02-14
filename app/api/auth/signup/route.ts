import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { StellarService } from '@/lib/stellar';
import { cookies } from 'next/headers';

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

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json({ error: 'Auth is not configured' }, { status: 500 });
        }

        const authClient = createClient(supabaseUrl, supabaseAnonKey);

        const { data: { user: authUser }, error } = await authClient.auth.signUp({
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

        const keypair = StellarService.generateAccount();
        const { data: appUser, error: insertError } = await supabase
            .from('users')
            .insert({
                email: authUser.email,
                auth_id: authUser.id,
                phone_number: null,
                pin_hash: 'password-auth',
                wallet_public: keypair.publicKey,
                wallet_secret: keypair.secretKey,
            })
            .select()
            .single();

        if (insertError) {
            console.error('Create user error:', insertError);
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
        console.error('Sign up Error:', err);
        return NextResponse.json({ error: 'Sign up failed' }, { status: 500 });
    }
}
