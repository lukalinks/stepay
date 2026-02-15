/**
 * Client-side Supabase config.
 * Supports both NEXT_PUBLIC_SUPABASE_ANON_KEY and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
 * (Supabase dashboard may use either name).
 */
export function getSupabaseClientConfig(): {
    url: string;
    anonKey: string;
} | null {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
        (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim();

    if (!url || !anonKey) return null;
    return { url, anonKey };
}
