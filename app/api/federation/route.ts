import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sepHomeDomain } from '@/lib/sep-config';

/**
 * Minimal SEP-0002 federation lookup: name*stepay.pro → wallet.
 * Accepts ?q=name*domain&type=name
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q')?.trim() || '';
        const type = searchParams.get('type')?.trim() || 'name';

        if (type !== 'name' || !q.includes('*')) {
            return NextResponse.json({ error: 'Unsupported federation query' }, { status: 400 });
        }

        const [name, domain] = q.split('*');
        const home = sepHomeDomain().toLowerCase();
        if (!name || (domain || '').toLowerCase() !== home) {
            return NextResponse.json({ error: 'Unknown address' }, { status: 404 });
        }

        // Resolve by email local-part or phone suffix for convenience.
        const rows = await sql`
            SELECT wallet_public, email, full_name FROM users
            WHERE lower(split_part(email, '@', 1)) = lower(${name})
               OR phone_normalized = ${name}
            LIMIT 1
        `;
        const user = rows[0] as
            | { wallet_public?: string; email?: string; full_name?: string }
            | undefined;

        if (!user?.wallet_public) {
            return NextResponse.json({ error: 'Unknown address' }, { status: 404 });
        }

        return NextResponse.json(
            {
                stellar_address: `${name}*${home}`,
                account_id: user.wallet_public,
                memo_type: 'text',
                memo: (user.full_name || name).slice(0, 28),
            },
            {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=60',
                },
            }
        );
    } catch (err) {
        console.error('Federation:', err);
        return NextResponse.json({ error: 'Federation lookup failed' }, { status: 500 });
    }
}
