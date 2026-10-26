import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { sql } from '@/lib/db';
import { logAdminAction } from '@/lib/admin-audit';
import {
    type AssignableAdminRole,
    adminRoleLabel,
    isAdminRole,
    isAssignableAdminRole,
} from '@/lib/admin-roles';
import { sendAdminInviteEmail } from '@/lib/email';
import { adminBaseUrl } from '@/lib/hosts';
import { Keypair } from '@stellar/stellar-sdk';

export type TeamMember = {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
    roleLabel: string;
    createdAt: string;
    suspended: boolean;
    hasPassword: boolean;
    isYou: boolean;
};

export async function listTeamMembers(viewerId: string): Promise<TeamMember[]> {
    const rows = await sql`
        SELECT id, email, full_name, role, created_at, suspended, password_hash
        FROM users
        WHERE role IN ('admin', 'admin_ops', 'admin_support')
        ORDER BY
            CASE role
                WHEN 'admin' THEN 0
                WHEN 'admin_ops' THEN 1
                ELSE 2
            END,
            created_at ASC
    `;
    return (rows as Record<string, unknown>[]).map((r) => ({
        id: String(r.id),
        email: String(r.email || ''),
        fullName: r.full_name ? String(r.full_name) : null,
        role: String(r.role || 'user'),
        roleLabel: adminRoleLabel(String(r.role || 'user')),
        createdAt: String(r.created_at),
        suspended: Boolean(r.suspended),
        hasPassword: Boolean(r.password_hash),
        isYou: String(r.id) === viewerId,
    }));
}

async function countSuperadmins(): Promise<number> {
    const rows = await sql`
        SELECT COUNT(*)::int AS c FROM users WHERE role = 'admin' AND COALESCE(suspended, false) = false
    `;
    return Number((rows[0] as { c: number }).c ?? 0);
}

function generateTempPassword(): string {
    // 16 chars, URL-safe-ish
    return randomBytes(12).toString('base64url').slice(0, 16);
}

export async function inviteAdmin(opts: {
    actorId: string;
    actorIp: string | null;
    email: string;
    role: string;
    fullName?: string;
}): Promise<{ member: TeamMember; temporaryPassword?: string; created: boolean }> {
    const email = opts.email.trim().toLowerCase();
    if (!email.includes('@') || email.length > 254) {
        throw new Error('Enter a valid email address');
    }
    if (!isAssignableAdminRole(opts.role)) {
        throw new Error('Invalid role');
    }
    const role = opts.role as AssignableAdminRole;
    const fullName = (opts.fullName || '').trim().slice(0, 100) || null;

    const existing = await sql`
        SELECT id, email, role, password_hash, full_name, suspended
        FROM users WHERE lower(trim(email)) = ${email} LIMIT 1
    `;
    const row = existing[0] as
        | {
              id: string;
              email: string;
              role: string;
              password_hash: string | null;
              full_name: string | null;
              suspended: boolean;
          }
        | undefined;

    if (row) {
        if (row.suspended) {
            throw new Error('This account is suspended. Unsuspend it before granting admin access.');
        }
        if (isAdminRole(row.role) && row.role === role) {
            throw new Error('This person is already on the team with that role.');
        }

        let temporaryPassword: string | undefined;
        let passwordHash = row.password_hash;
        if (!passwordHash) {
            temporaryPassword = generateTempPassword();
            passwordHash = await bcrypt.hash(temporaryPassword, 10);
        }

        await sql`
            UPDATE users
            SET role = ${role},
                full_name = COALESCE(${fullName}, full_name),
                password_hash = ${passwordHash},
                session_token_version = COALESCE(session_token_version, 0) + 1,
                updated_at = NOW()
            WHERE id = ${row.id}
        `;
        await logAdminAction({
            adminUserId: opts.actorId,
            action: 'team.invite_existing',
            targetType: 'user',
            targetId: row.id,
            details: { email, role, previousRole: row.role },
            ip: opts.actorIp,
        });

        const loginUrl = `${adminBaseUrl()}/login`;
        const emailed = await sendAdminInviteEmail({
            to: email,
            roleLabel: adminRoleLabel(role),
            loginUrl,
            temporaryPassword: temporaryPassword ?? null,
            existingAccount: true,
        });

        const [member] = (await listTeamMembers(opts.actorId)).filter((m) => m.id === row.id);
        return {
            member: member || {
                id: row.id,
                email,
                fullName: fullName || row.full_name,
                role,
                roleLabel: adminRoleLabel(role),
                createdAt: new Date().toISOString(),
                suspended: false,
                hasPassword: true,
                isYou: row.id === opts.actorId,
            },
            temporaryPassword: temporaryPassword && !emailed ? temporaryPassword : undefined,
            created: false,
        };
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    // Staff accounts need a Stellar keypair for schema compatibility; they won't use the wallet.
    const kp = Keypair.random();

    const inserted = await sql`
        INSERT INTO users (
            email,
            phone_number,
            pin_hash,
            password_hash,
            wallet_public,
            wallet_secret,
            role,
            full_name,
            country_code,
            terms_accepted_at
        ) VALUES (
            ${email},
            null,
            ${'password-auth'},
            ${passwordHash},
            ${kp.publicKey()},
            null,
            ${role},
            ${fullName},
            ${'ZM'},
            NOW()
        )
        RETURNING id, created_at
    `;
    const created = inserted[0] as { id: string; created_at: string } | undefined;
    if (!created) throw new Error('Could not create admin account');

    await logAdminAction({
        adminUserId: opts.actorId,
        action: 'team.invite_create',
        targetType: 'user',
        targetId: created.id,
        details: { email, role },
        ip: opts.actorIp,
    });

    const loginUrl = `${adminBaseUrl()}/login`;
    const emailed = await sendAdminInviteEmail({
        to: email,
        roleLabel: adminRoleLabel(role),
        loginUrl,
        temporaryPassword: tempPassword,
        existingAccount: false,
    });

    return {
        member: {
            id: created.id,
            email,
            fullName,
            role,
            roleLabel: adminRoleLabel(role),
            createdAt: String(created.created_at),
            suspended: false,
            hasPassword: true,
            isYou: false,
        },
        temporaryPassword: emailed ? undefined : tempPassword,
        created: true,
    };
}

export async function updateTeamRole(opts: {
    actorId: string;
    actorIp: string | null;
    targetId: string;
    role: string;
}): Promise<void> {
    if (!isAssignableAdminRole(opts.role) && opts.role !== 'user') {
        throw new Error('Invalid role');
    }

    const rows = await sql`
        SELECT id, email, role FROM users WHERE id = ${opts.targetId} LIMIT 1
    `;
    const target = rows[0] as { id: string; email: string; role: string } | undefined;
    if (!target) throw new Error('User not found');

    if (target.role === 'admin' && opts.role !== 'admin') {
        const n = await countSuperadmins();
        if (n <= 1) {
            throw new Error('Cannot remove the last superadmin.');
        }
    }

    if (opts.targetId === opts.actorId && opts.role !== 'admin' && target.role === 'admin') {
        throw new Error('You cannot demote your own superadmin role.');
    }

    await sql`
        UPDATE users
        SET role = ${opts.role},
            session_token_version = COALESCE(session_token_version, 0) + 1,
            updated_at = NOW()
        WHERE id = ${opts.targetId}
    `;
    await logAdminAction({
        adminUserId: opts.actorId,
        action: opts.role === 'user' ? 'team.revoke' : 'team.set_role',
        targetType: 'user',
        targetId: opts.targetId,
        details: { email: target.email, previousRole: target.role, role: opts.role },
        ip: opts.actorIp,
    });
}

export async function revokeTeamMember(opts: {
    actorId: string;
    actorIp: string | null;
    targetId: string;
}): Promise<void> {
    if (opts.targetId === opts.actorId) {
        throw new Error('You cannot remove yourself from the team.');
    }
    await updateTeamRole({ ...opts, role: 'user' });
}
