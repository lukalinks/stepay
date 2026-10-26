/** Pure role helpers — safe for client components (no DB imports). */

/** Superadmin — full access including settings and role changes. */
export const SUPERADMIN_ROLES = ['admin'] as const;

/** Ops — treasury, retries, merchant admin, user suspend. */
export const OPS_ROLES = ['admin', 'admin_ops'] as const;

/** Support — view data, resolve compliance alerts (no treasury / retries / PII export). */
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

/** Invite / demote / change admin team roles — superadmin only. */
export function canManageTeam(role: string | null | undefined): boolean {
    return canChangeSettings(role);
}

export function canManageUsers(role: string | null | undefined): boolean {
    return canRunOps(role);
}

export const ASSIGNABLE_ADMIN_ROLES = ['admin', 'admin_ops', 'admin_support'] as const;
export type AssignableAdminRole = (typeof ASSIGNABLE_ADMIN_ROLES)[number];

export function isAssignableAdminRole(role: string): role is AssignableAdminRole {
    return (ASSIGNABLE_ADMIN_ROLES as readonly string[]).includes(role);
}

export function adminRoleDescription(role: string): string {
    if (role === 'admin') return 'Full access — settings, team, exports';
    if (role === 'admin_ops') return 'Treasury, retries, suspend users';
    if (role === 'admin_support') return 'View data and compliance';
    return '';
}

/** Users CSV / wallet exports — superadmin only. */
export function canExportPii(role: string | null | undefined): boolean {
    return canChangeSettings(role);
}

/** Transaction CSV — ops + superadmin. */
export function canExportTransactions(role: string | null | undefined): boolean {
    return canRunOps(role);
}

export function adminRoleLabel(role: string): string {
    if (role === 'admin') return 'Superadmin';
    if (role === 'admin_ops') return 'Ops';
    if (role === 'admin_support') return 'Support';
    return role;
}
