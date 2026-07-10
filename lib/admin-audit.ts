import { sql } from '@/lib/db';

export async function logAdminAction(input: {
    adminUserId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    details?: Record<string, unknown>;
    ip?: string | null;
}): Promise<void> {
    try {
        await sql`
            INSERT INTO admin_actions (admin_user_id, action, target_type, target_id, details, ip)
            VALUES (
                ${input.adminUserId},
                ${input.action},
                ${input.targetType ?? null},
                ${input.targetId ?? null},
                ${JSON.stringify(input.details ?? {})}::jsonb,
                ${input.ip ?? null}
            )
        `;
    } catch (err) {
        console.error('logAdminAction:', err);
    }
}
