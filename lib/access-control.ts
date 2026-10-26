import { randomBytes } from 'crypto';
import { sql } from '@/lib/db';
import { mainBaseUrl } from '@/lib/hosts';
import { sendInviteEmail, sendWaitlistOpenEmail } from '@/lib/email';
import { inviteWhatsAppMessage, notifyInvite } from '@/lib/notifications';
import { isValidZambianPhone, normalizeZambianPhone } from '@/lib/phone';
import { whatsAppShareUrl } from '@/lib/share';

export type AccessSettings = {
    publicLaunch: boolean;
};

export type InviteRow = {
    id: string;
    email: string;
    phone: string | null;
    token: string;
    status: 'pending' | 'accepted' | 'revoked';
    invited_by: string | null;
    created_at: string;
    accepted_at: string | null;
    accepted_user_id: string | null;
};

export type InviteDelivery = {
    invite: InviteRow;
    emailed: boolean;
    whatsapped: boolean;
    whatsAppUrl: string;
};

function normalizeInvitePhone(phone?: string | null): string | null {
    if (!phone?.trim()) return null;
    if (!isValidZambianPhone(phone)) {
        throw new Error('Enter a valid Zambian mobile number (e.g. 0977123456).');
    }
    return normalizeZambianPhone(phone);
}

function inviteWhatsAppUrl(token: string, phone?: string | null): string {
    return whatsAppShareUrl(inviteWhatsAppMessage(inviteSignupUrl(token)), phone);
}

let accessCache: { value: AccessSettings; expiry: number } | null = null;
const ACCESS_CACHE_MS = 2000;

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

export function invalidateAccessCache(): void {
    accessCache = null;
}

export async function getAccessSettings(): Promise<AccessSettings> {
    if (accessCache && Date.now() < accessCache.expiry) {
        return accessCache.value;
    }
    try {
        const rows = await sql`
            SELECT value_json FROM platform_settings WHERE key = 'access' LIMIT 1
        `;
        const raw = rows[0] as { value_json: string } | undefined;
        let publicLaunch = true;
        if (raw?.value_json) {
            try {
                const parsed = JSON.parse(raw.value_json) as { publicLaunch?: unknown };
                if (typeof parsed.publicLaunch === 'boolean') {
                    publicLaunch = parsed.publicLaunch;
                }
            } catch {
                // keep default
            }
        }
        const value = { publicLaunch };
        accessCache = { value, expiry: Date.now() + ACCESS_CACHE_MS };
        return value;
    } catch (err) {
        console.error('getAccessSettings:', err);
        // Fail closed — do not open public signup when settings are unreadable.
        return { publicLaunch: false };
    }
}

export async function isPublicLaunch(): Promise<boolean> {
    const { publicLaunch } = await getAccessSettings();
    return publicLaunch;
}

export async function setPublicLaunch(publicLaunch: boolean): Promise<AccessSettings> {
    const value = { publicLaunch: Boolean(publicLaunch) };
    await sql`
        INSERT INTO platform_settings (key, value_json, updated_at)
        VALUES ('access', ${JSON.stringify(value)}, NOW())
        ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = NOW()
    `;
    invalidateAccessCache();
    return value;
}

function newInviteToken(): string {
    return randomBytes(24).toString('hex');
}

export function inviteSignupUrl(token: string): string {
    return `${mainBaseUrl()}/signup?invite=${encodeURIComponent(token)}`;
}

export function publicSignupUrl(): string {
    return `${mainBaseUrl()}/signup`;
}

export async function getPendingInviteByToken(token: string): Promise<InviteRow | null> {
    const t = token.trim();
    if (!t) return null;
    const rows = await sql`
        SELECT * FROM invites
        WHERE token = ${t} AND status = 'pending'
        LIMIT 1
    `;
    return (rows[0] as InviteRow | undefined) ?? null;
}

export async function getPendingInviteByEmail(email: string): Promise<InviteRow | null> {
    const normalized = normalizeEmail(email);
    if (!normalized.includes('@')) return null;
    const rows = await sql`
        SELECT * FROM invites
        WHERE lower(trim(email)) = ${normalized} AND status = 'pending'
        LIMIT 1
    `;
    return (rows[0] as InviteRow | undefined) ?? null;
}

/** True when signup may proceed for this email (public launch or valid pending invite). */
export async function canSignupWithEmail(
    email: string,
    inviteToken?: string | null
): Promise<{ allowed: boolean; invite: InviteRow | null }> {
    if (await isPublicLaunch()) {
        return { allowed: true, invite: null };
    }
    const byToken = inviteToken ? await getPendingInviteByToken(inviteToken) : null;
    if (byToken && normalizeEmail(byToken.email) === normalizeEmail(email)) {
        return { allowed: true, invite: byToken };
    }
    const byEmail = await getPendingInviteByEmail(email);
    if (byEmail) {
        return { allowed: true, invite: byEmail };
    }
    return { allowed: false, invite: null };
}

export async function createAndSendInvite(
    email: string,
    invitedBy: string | null,
    phone?: string | null
): Promise<InviteDelivery> {
    const normalized = normalizeEmail(email);
    if (!normalized.includes('@')) {
        throw new Error('Please enter a valid email address.');
    }
    const phoneNorm = normalizeInvitePhone(phone);

    const existingUser = await sql`
        SELECT id FROM users WHERE lower(trim(email)) = ${normalized} LIMIT 1
    `;
    if (existingUser.length) {
        throw new Error('An account with this email already exists.');
    }

    const existing = await sql`
        SELECT * FROM invites WHERE lower(trim(email)) = ${normalized} LIMIT 1
    `;
    const current = existing[0] as InviteRow | undefined;

    let invite: InviteRow;
    if (current?.status === 'accepted') {
        throw new Error('This email already accepted an invite.');
    }

    if (current) {
        // Reuse existing token so older invite emails remain valid.
        const nextPhone = phoneNorm ?? current.phone ?? null;
        const rows = await sql`
            UPDATE invites
            SET status = 'pending',
                invited_by = ${invitedBy},
                phone = ${nextPhone},
                accepted_at = NULL,
                accepted_user_id = NULL,
                created_at = NOW()
            WHERE id = ${current.id}
            RETURNING *
        `;
        invite = rows[0] as InviteRow;
    } else {
        const token = newInviteToken();
        const rows = await sql`
            INSERT INTO invites (email, phone, token, invited_by, status)
            VALUES (${normalized}, ${phoneNorm}, ${token}, ${invitedBy}, 'pending')
            RETURNING *
        `;
        invite = rows[0] as InviteRow;
    }

    const signupUrl = inviteSignupUrl(invite.token);
    const emailed = await sendInviteEmail(normalized, signupUrl);
    let whatsapped = false;
    if (invite.phone) {
        whatsapped = await notifyInvite({ phone: invite.phone, signupUrl });
    }
    return {
        invite,
        emailed,
        whatsapped,
        whatsAppUrl: inviteWhatsAppUrl(invite.token, invite.phone),
    };
}

export async function listInvites(limit = 50): Promise<InviteRow[]> {
    const rows = await sql`
        SELECT * FROM invites
        ORDER BY created_at DESC
        LIMIT ${limit}
    `;
    return rows as unknown as InviteRow[];
}

export async function resendInvite(
    inviteId: string,
    phone?: string | null
): Promise<{ emailed: boolean; whatsapped: boolean; whatsAppUrl: string; invite: InviteRow }> {
    const rows = await sql`
        SELECT * FROM invites WHERE id = ${inviteId} LIMIT 1
    `;
    const invite = rows[0] as InviteRow | undefined;
    if (!invite) throw new Error('Invite not found.');
    if (invite.status === 'accepted') throw new Error('Invite already accepted.');
    if (invite.status === 'revoked') throw new Error('Invite was revoked. Create a new invite.');

    const phoneNorm = phone !== undefined && phone !== null && String(phone).trim()
        ? normalizeInvitePhone(phone)
        : invite.phone;

    // Keep the same token so previously emailed links keep working.
    const updated = await sql`
        UPDATE invites
        SET created_at = NOW(),
            phone = ${phoneNorm}
        WHERE id = ${inviteId}
        RETURNING *
    `;
    const next = updated[0] as InviteRow;
    const signupUrl = inviteSignupUrl(next.token);
    const emailed = await sendInviteEmail(normalizeEmail(next.email), signupUrl);
    let whatsapped = false;
    if (next.phone) {
        whatsapped = await notifyInvite({ phone: next.phone, signupUrl });
    }
    return {
        invite: next,
        emailed,
        whatsapped,
        whatsAppUrl: inviteWhatsAppUrl(next.token, next.phone),
    };
}

export async function revokeInvite(inviteId: string): Promise<void> {
    const rows = await sql`
        UPDATE invites
        SET status = 'revoked'
        WHERE id = ${inviteId} AND status = 'pending'
        RETURNING id
    `;
    if (!rows[0]) throw new Error('Pending invite not found.');
}

export async function markInviteAccepted(email: string, userId: string): Promise<string | null> {
    const normalized = normalizeEmail(email);
    const rows = await sql`
        UPDATE invites
        SET status = 'accepted',
            accepted_at = NOW(),
            accepted_user_id = ${userId}
        WHERE lower(trim(email)) = ${normalized} AND status = 'pending'
        RETURNING id
    `;
    const id = (rows[0] as { id: string } | undefined)?.id ?? null;
    if (id) {
        await sql`UPDATE users SET invite_id = ${id} WHERE id = ${userId}`;
    }
    return id;
}

export async function joinWaitlist(
    email: string
): Promise<{ created: boolean; pendingInvite?: boolean }> {
    const normalized = normalizeEmail(email);
    if (!normalized.includes('@')) {
        throw new Error('Please enter a valid email address.');
    }

    const existingUser = await sql`
        SELECT id FROM users WHERE lower(trim(email)) = ${normalized} LIMIT 1
    `;
    if (existingUser.length) {
        throw new Error('An account with this email already exists. Try signing in.');
    }

    const pendingInvite = await getPendingInviteByEmail(normalized);
    if (pendingInvite) {
        return { created: false, pendingInvite: true };
    }

    const existing = await sql`
        SELECT id FROM waitlist WHERE lower(trim(email)) = ${normalized} LIMIT 1
    `;
    if (existing.length) {
        return { created: false };
    }

    await sql`INSERT INTO waitlist (email) VALUES (${normalized})`;
    return { created: true };
}

export async function listWaitlist(limit = 100): Promise<
    Array<{ id: string; email: string; created_at: string; notified_at: string | null }>
> {
    const rows = await sql`
        SELECT id, email, created_at, notified_at FROM waitlist
        ORDER BY created_at DESC
        LIMIT ${limit}
    `;
    return rows as unknown as Array<{
        id: string;
        email: string;
        created_at: string;
        notified_at: string | null;
    }>;
}

export async function waitlistCount(): Promise<{ total: number; unnotified: number }> {
    const rows = await sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE notified_at IS NULL)::int AS unnotified
        FROM waitlist
    `;
    const row = rows[0] as { total: number; unnotified: number } | undefined;
    return { total: Number(row?.total ?? 0), unnotified: Number(row?.unnotified ?? 0) };
}

/** Email waitlisted users who have not been notified yet. */
export async function notifyWaitlistOnLaunch(): Promise<{ sent: number; failed: number }> {
    const rows = await sql`
        SELECT id, email FROM waitlist WHERE notified_at IS NULL ORDER BY created_at ASC LIMIT 500
    `;
    let sent = 0;
    let failed = 0;
    const url = publicSignupUrl();

    for (const row of rows as unknown as Array<{ id: string; email: string }>) {
        const ok = await sendWaitlistOpenEmail(normalizeEmail(row.email), url);
        if (ok) {
            await sql`UPDATE waitlist SET notified_at = NOW() WHERE id = ${row.id}`;
            sent += 1;
        } else {
            failed += 1;
        }
    }
    return { sent, failed };
}
