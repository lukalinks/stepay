/**
 * Pure unit tests for admin role helpers (no DB).
 * Usage: node scripts/test-admin-roles.mjs
 */

let passed = 0;
let failed = 0;

function assert(cond, msg) {
    if (cond) {
        passed += 1;
        console.log(`  ✓ ${msg}`);
    } else {
        failed += 1;
        console.error(`  ✗ ${msg}`);
    }
}

const SUPERADMIN_ROLES = ['admin'];
const OPS_ROLES = ['admin', 'admin_ops'];
const SUPPORT_ROLES = ['admin', 'admin_ops', 'admin_support'];
const ASSIGNABLE_ADMIN_ROLES = ['admin', 'admin_ops', 'admin_support'];

function isAdminRole(role) {
    return !!role && SUPPORT_ROLES.includes(role);
}
function canManageTeam(role) {
    return !!role && SUPERADMIN_ROLES.includes(role);
}
function canRunOps(role) {
    return !!role && OPS_ROLES.includes(role);
}
function isAssignableAdminRole(role) {
    return ASSIGNABLE_ADMIN_ROLES.includes(role);
}
function adminRoleLabel(role) {
    if (role === 'admin') return 'Superadmin';
    if (role === 'admin_ops') return 'Ops';
    if (role === 'admin_support') return 'Support';
    return role;
}

/** Mirrors updateTeamRole guard decisions (pure). */
function canChangeRole({ actorId, targetId, targetRole, nextRole, superadminCount }) {
    if (!isAssignableAdminRole(nextRole) && nextRole !== 'user') {
        return { ok: false, reason: 'Invalid role' };
    }
    if (targetRole === 'admin' && nextRole !== 'admin' && superadminCount <= 1) {
        return { ok: false, reason: 'Cannot remove the last superadmin.' };
    }
    if (targetId === actorId && nextRole !== 'admin' && targetRole === 'admin') {
        return { ok: false, reason: 'You cannot demote your own superadmin role.' };
    }
    return { ok: true };
}

function canRevoke({ actorId, targetId }) {
    if (targetId === actorId) return { ok: false, reason: 'You cannot remove yourself from the team.' };
    return { ok: true };
}

console.log('\nAdmin role unit tests\n');

assert(canManageTeam('admin'), 'superadmin can manage team');
assert(!canManageTeam('admin_ops'), 'ops cannot manage team');
assert(!canManageTeam('admin_support'), 'support cannot manage team');
assert(!canManageTeam('user'), 'user cannot manage team');

assert(canRunOps('admin_ops'), 'ops can run ops');
assert(!canRunOps('admin_support'), 'support cannot run ops');

assert(isAdminRole('admin_support'), 'support is admin');
assert(!isAdminRole('user'), 'user is not admin');

assert(isAssignableAdminRole('admin_ops'), 'ops is assignable');
assert(!isAssignableAdminRole('user'), 'user is not assignable admin role');

assert(adminRoleLabel('admin') === 'Superadmin', 'label superadmin');
assert(adminRoleLabel('admin_ops') === 'Ops', 'label ops');

assert(
    canChangeRole({
        actorId: 'a1',
        targetId: 'a2',
        targetRole: 'admin',
        nextRole: 'admin_ops',
        superadminCount: 1,
    }).ok === false,
    'block demote last superadmin'
);

assert(
    canChangeRole({
        actorId: 'a1',
        targetId: 'a2',
        targetRole: 'admin',
        nextRole: 'admin_ops',
        superadminCount: 2,
    }).ok === true,
    'allow demote when another superadmin exists'
);

assert(
    canChangeRole({
        actorId: 'a1',
        targetId: 'a1',
        targetRole: 'admin',
        nextRole: 'admin_ops',
        superadminCount: 2,
    }).ok === false,
    'block self-demote of superadmin'
);

assert(
    canChangeRole({
        actorId: 'a1',
        targetId: 'a2',
        targetRole: 'user',
        nextRole: 'admin_support',
        superadminCount: 1,
    }).ok === true,
    'allow promote user to support'
);

assert(
    canChangeRole({
        actorId: 'a1',
        targetId: 'a2',
        targetRole: 'admin_ops',
        nextRole: 'bogus',
        superadminCount: 1,
    }).ok === false,
    'reject invalid role'
);

assert(canRevoke({ actorId: 'a1', targetId: 'a1' }).ok === false, 'block self-revoke');
assert(canRevoke({ actorId: 'a1', targetId: 'a2' }).ok === true, 'allow revoke other');

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
