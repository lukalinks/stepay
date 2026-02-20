import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { StellarService } from '@/lib/stellar';
import { getSupabaseClientConfig } from '@/lib/supabase-client';

/**
 * Creates or links app user for an auth user. Used by login and getUserIdFromRequest.
 */
export async function createOrGetAppUser(authUser: { id: string; email?: string | null }): Promise<string | null> {
    const email = authUser.email;
    if (!email) return null;

    let { data: appUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authUser.id)
        .single();

    if (!appUser) {
        const { data: byEmail } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (byEmail) {
            await supabase.from('users').update({ auth_id: authUser.id }).eq('id', byEmail.id);
            return byEmail.id;
        }

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
            .select('id')
            .single();

        if (error) return null;
        return newUser?.id ?? null;
    }
    return appUser.id;
}

/**
 * Resolves the Stepay user ID from the request.
 * Supports both:
 * - Cookie (web): stepay_user
 * - Header (mobile): Authorization: Bearer <supabase_access_token>
 * Creates app user if auth user exists but app user is missing (e.g. signup race).
 */
export async function getUserIdFromRequest(request: Request): Promise<string | null> {
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get('stepay_user')?.value;
    if (cookieUserId) return cookieUserId;

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    if (!token) return null;

    const config = getSupabaseClientConfig();
    if (!config) return null;

    const authClient = createClient(config.url, config.anonKey);
    const { data: { user }, error } = await authClient.auth.getUser(token);
    if (error || !user) return null;

    const { data: appUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

    if (appUser) return appUser.id;

    // Auth user exists but no app user - create or link (e.g. signup created auth but app user failed)
    return createOrGetAppUser(user);
}
