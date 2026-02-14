import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { StellarService } from '@/lib/stellar';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { accessToken, next } = body || {};

        if (!accessToken || typeof accessToken !== 'string') {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
        }

        const authClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user: authUser }, error } = await authClient.auth.getUser(accessToken);

        if (error || !authUser?.email) {
            return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
        }

        // Find or create app user
        let { data: appUser } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', authUser.id)
            .single();

        if (!appUser) {
            const { data: byEmail } = await supabase
                .from('users')
                .select('*')
                .eq('email', authUser.email)
                .single();

            if (byEmail) {
                await supabase
                    .from('users')
                    .update({ auth_id: authUser.id })
                    .eq('id', byEmail.id);
                appUser = { ...byEmail, auth_id: authUser.id };
            } else {
                const keypair = StellarService.generateAccount();
                const { data: newUser, error: insertError } = await supabase
                    .from('users')
                    .insert({
                        email: authUser.email,
                        auth_id: authUser.id,
                        phone_number: null,
                        pin_hash: 'email-auth',
                        wallet_public: keypair.publicKey,
                        wallet_secret: keypair.secretKey,
                    })
                    .select()
                    .single();

                if (insertError) {
                    console.error('Create user error:', insertError);
                    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
                }
                appUser = newUser;
            }
        }

        const cookieStore = await cookies();
        cookieStore.set('stepay_user', appUser.id, {
            httpOnly: true,
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Auth complete error:', err);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
