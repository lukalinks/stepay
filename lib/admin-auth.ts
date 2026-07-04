import { sql } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

export async function requireAdmin(request: Request): Promise<string | null> {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return null;
    const rows = await sql`SELECT role FROM users WHERE id = ${userId} LIMIT 1`;
    const role = (rows[0] as { role?: string } | undefined)?.role;
    return role === 'admin' ? userId : null;
}
