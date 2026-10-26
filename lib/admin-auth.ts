import { sql } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import {
    type AdminRole,
    isAdminRole,
} from '@/lib/admin-roles';

export {
    SUPERADMIN_ROLES,
    OPS_ROLES,
    SUPPORT_ROLES,
    ASSIGNABLE_ADMIN_ROLES,
    isAdminRole,
    isAssignableAdminRole,
    canAccessAdminPanel,
    canRunOps,
    canChangeSettings,
    canManageTeam,
    canManageUsers,
    canExportPii,
    canExportTransactions,
    adminRoleLabel,
    adminRoleDescription,
} from '@/lib/admin-roles';
export type { AdminRole, AssignableAdminRole } from '@/lib/admin-roles';

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
