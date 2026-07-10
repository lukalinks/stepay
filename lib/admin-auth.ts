import { sql } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';

/** Superadmin — full access including settings and role changes. */
export const SUPERADMIN_ROLES = ['admin'] as const;

/** Ops — treasury, retries, merchant admin, user suspend. */
export const OPS_ROLES = ['admin', 'admin_ops'] as const;

/** Support — view data, retry stuck txs, resolve compliance alerts. */
export const SUPPORT_ROLES = ['admin', 'admin_ops', 'admin_support'] as const;

export type AdminRole = (typeof SUPPORT_ROLES)[number];

export function isAdminRole(role: string | null | undefined): role is AdminRole {
    return !!role && (SUPPORT_ROLES as readonly string[]).includes(role);
}

export function canAccessAdminPanel(role: string | null | undefined): boolean {
    return isAdminRole(role);
}

export function canRunOps(role: string | null | undefined): boolean {
    return !!role && (OPS_ROLES as readonly string[]).includes(role);
}

export function canChangeSettings(role: string | null | undefined): boolean {
    return !!role && (SUPERADMIN_ROLES as readonly string[]).includes(role);
}

export function canManageUsers(role: string | null | undefined): boolean {
    return canRunOps(role);
}

export async function getAdminContext(
    request: Request
): Promise<{ userId: string; role: AdminRole; ip: string | null } | null> {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return null;
    const rows = await sql`SELECT role FROM users WHERE id = ${userId} LIMIT 1`;
    const role = (rows[0] as { role?: string } | undefined)?.role;
    if (!isAdminRole(role)) return null;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip');
    return { userId, role, ip: ip ?? null };
}

/** @deprecated Use getAdminContext — kept for existing imports. */
export async function requireAdmin(request: Request): Promise<string | null> {
    const ctx = await getAdminContext(request);
    return ctx?.userId ?? null;
}

export function adminRoleLabel(role: string): string {
    if (role === 'admin') return 'Superadmin';
    if (role === 'admin_ops') return 'Ops';
    if (role === 'admin_support') return 'Support';
    return role;
}
