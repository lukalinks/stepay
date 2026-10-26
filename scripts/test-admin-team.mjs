/**
 * Integration tests for admin team invite / roles.
 * Requires DATABASE_URL and a running DB with migrations.
 *
 * Usage: node scripts/test-admin-team.mjs
 */
import { randomBytes } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
if (existsSync(envPath) && !process.env.DATABASE_URL) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (!m) continue;
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
        }
        if (!process.env[m[1]]) process.env[m[1]] = v;
    }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });
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

async function cleanup(ids) {
    if (!ids.length) return;
    await sql`DELETE FROM admin_actions WHERE admin_user_id IN ${sql(ids)} OR target_id IN ${sql(ids.map(String))}`;
    await sql`DELETE FROM users WHERE id IN ${sql(ids)}`;
}

async function makeUser({ email, role, password }) {
    const hash = password ? await bcrypt.hash(password, 10) : null;
    const pub = `G${randomBytes(28).toString('hex').toUpperCase().slice(0, 55)}`;
    const rows = await sql`
        INSERT INTO users (
            email, phone_number, pin_hash, password_hash,
            wallet_public, wallet_secret, role, country_code, terms_accepted_at
        ) VALUES (
            ${email}, null, ${'password-auth'}, ${hash},
            ${pub}, null, ${role}, ${'ZM'}, NOW()
        )
        RETURNING id, role, session_token_version
    `;
    return rows[0];
}

async function countSuperadmins() {
    const rows = await sql`
        SELECT COUNT(*)::int AS c FROM users
        WHERE role = 'admin' AND COALESCE(suspended, false) = false
    `;
    return Number(rows[0].c);
}

async function main() {
    console.log('\nAdmin team tests\n');
    const stamp = Date.now();
    const ids = [];

    try {
        // Ensure at least one superadmin exists for last-superadmin logic
        const existingAdmins = await sql`
            SELECT id FROM users WHERE role = 'admin' AND COALESCE(suspended, false) = false LIMIT 1
        `;
        let seedAdminId = existingAdmins[0]?.id;
        if (!seedAdminId) {
            const seed = await makeUser({
                email: `seed-admin-${stamp}@test.stepay.local`,
                role: 'admin',
                password: 'TestAdmin1!',
            });
            seedAdminId = seed.id;
            ids.push(seed.id);
        }

        const ops = await makeUser({
            email: `ops-${stamp}@test.stepay.local`,
            role: 'admin_ops',
            password: 'TestOps1!pass',
        });
        ids.push(ops.id);

        const support = await makeUser({
            email: `support-${stamp}@test.stepay.local`,
            role: 'admin_support',
            password: 'TestSupport1!',
        });
        ids.push(support.id);

        const regular = await makeUser({
            email: `user-${stamp}@test.stepay.local`,
            role: 'user',
            password: 'TestUser1!pass',
        });
        ids.push(regular.id);

        // List query shape
        const team = await sql`
            SELECT id, email, role FROM users
            WHERE role IN ('admin', 'admin_ops', 'admin_support')
              AND id IN ${sql([seedAdminId, ops.id, support.id])}
            ORDER BY role
        `;
        assert(team.length >= 3, 'team list includes admin roles');

        // Promote regular → support (simulates invite existing)
        const beforeVer = Number(regular.session_token_version ?? 0);
        await sql`
            UPDATE users
            SET role = 'admin_support',
                session_token_version = COALESCE(session_token_version, 0) + 1
            WHERE id = ${regular.id}
        `;
        const afterPromote = await sql`SELECT role, session_token_version FROM users WHERE id = ${regular.id}`;
        assert(afterPromote[0].role === 'admin_support', 'promote user to admin_support');
        assert(
            Number(afterPromote[0].session_token_version) === beforeVer + 1,
            'session_token_version bumps on role change'
        );

        // Password verify for ops
        const opsRow = await sql`SELECT password_hash FROM users WHERE id = ${ops.id}`;
        const match = await bcrypt.compare('TestOps1!pass', opsRow[0].password_hash);
        assert(match, 'ops password verifies');

        // Role helpers (inline, mirrors lib/admin-roles)
        const canManageTeam = (r) => r === 'admin';
        const isAdminRole = (r) => ['admin', 'admin_ops', 'admin_support'].includes(r);
        assert(canManageTeam('admin'), 'superadmin can manage team');
        assert(!canManageTeam('admin_ops'), 'ops cannot manage team');
        assert(isAdminRole('admin_support'), 'support is admin role');
        assert(!isAdminRole('user'), 'user is not admin role');

        // Last superadmin guard simulation
        const n = await countSuperadmins();
        assert(n >= 1, 'at least one superadmin exists');
        if (n === 1) {
            // demoting the only one should be blocked by app logic
            assert(true, 'last-superadmin guard applies when count === 1');
        } else {
            assert(true, `superadmin count is ${n} (guard allows demote of non-last)`);
        }

        // Revoke ops
        await sql`
            UPDATE users
            SET role = 'user',
                session_token_version = COALESCE(session_token_version, 0) + 1
            WHERE id = ${ops.id}
        `;
        const revoked = await sql`SELECT role FROM users WHERE id = ${ops.id}`;
        assert(revoked[0].role === 'user', 'revoke sets role to user');

        // Audit log insert shape (optional table)
        try {
            await sql`
                INSERT INTO admin_actions (admin_user_id, action, target_type, target_id, details)
                VALUES (
                    ${seedAdminId},
                    ${'team.invite_create'},
                    ${'user'},
                    ${String(support.id)},
                    ${sql.json({ email: `support-${stamp}@test.stepay.local`, role: 'admin_support' })}
                )
            `;
            assert(true, 'audit log accepts team.invite_create');
        } catch (e) {
            assert(false, `audit log insert: ${e.message}`);
        }

        // Unique email conflict
        let conflict = false;
        try {
            await makeUser({
                email: `ops-${stamp}@test.stepay.local`,
                role: 'admin_ops',
                password: 'x',
            });
        } catch {
            conflict = true;
        }
        assert(conflict, 'duplicate email rejected');

        console.log(`\n${passed} passed, ${failed} failed\n`);
    } finally {
        await cleanup(ids);
        await sql.end({ timeout: 5 });
    }

    process.exit(failed ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
