import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getSupabaseClientConfig } from '@/lib/supabase-client';

/**
 * Resolves the Stepay user ID from the request.
 * Supports both:
 * - Cookie (web): stepay_user
 * - Header (mobile): Authorization: Bearer <supabase_access_token>
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

    return appUser?.id ?? null;
}
