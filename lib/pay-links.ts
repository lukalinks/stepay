import { randomBytes } from 'crypto';
import { sql } from '@/lib/db';

export async function getOrCreatePayLink(userId: string): Promise<{
    slug: string;
    label: string | null;
    amount: number | null;
    asset: string;
    payUrl: string;
}> {
    const existing = await sql`
        SELECT slug, label, amount, asset FROM pay_links
        WHERE user_id = ${userId} AND active = true
        ORDER BY created_at ASC
        LIMIT 1
    `;
    let row = existing[0] as { slug: string; label?: string | null; amount?: number | null; asset: string } | undefined;

    if (!row) {
        const slug = randomBytes(16).toString('hex');
        await sql`
            INSERT INTO pay_links (user_id, slug, label, asset)
            VALUES (${userId}, ${slug}, ${'Pay me on Stepay'}, 'usdc')
        `;
        row = { slug, label: 'Pay me on Stepay', amount: null, asset: 'usdc' };
    }

    const origin = process.env.AUTH_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    return {
        slug: row.slug,
        label: row.label ?? null,
        amount: row.amount != null ? Number(row.amount) : null,
        asset: row.asset || 'usdc',
        payUrl: `${origin}/pay/${row.slug}`,
    };
}

export async function getPayLinkBySlug(slug: string) {
    const rows = await sql`
        SELECT p.*, u.full_name, u.wallet_public, u.phone_number
        FROM pay_links p
        JOIN users u ON u.id = p.user_id
        WHERE p.slug = ${slug} AND p.active = true
        LIMIT 1
    `;
    return (rows[0] as Record<string, unknown> | undefined) ?? null;
}

export async function updatePayLink(
    userId: string,
    opts: { label?: string; amount?: number | null; asset?: 'xlm' | 'usdc' }
): Promise<void> {
    const link = await getOrCreatePayLink(userId);
    await sql`
        UPDATE pay_links
        SET
            label = ${opts.label ?? link.label},
            amount = ${opts.amount === undefined ? link.amount : opts.amount},
            asset = ${opts.asset ?? link.asset}
        WHERE slug = ${link.slug} AND user_id = ${userId}
    `;
}
