import { NextResponse } from 'next/server';
import { readUserAvatar } from '@/lib/avatar-storage';
import { sql } from '@/lib/db';

/** Public-ish avatar fetch (only if user has avatar_url set). */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        if (!userId || userId.length > 80) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const rows = await sql`
            SELECT avatar_url FROM users WHERE id = ${userId} LIMIT 1
        `;
        const avatarUrl = (rows[0] as { avatar_url?: string } | undefined)?.avatar_url;
        if (!avatarUrl) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const file = await readUserAvatar(userId);
        if (!file) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return new NextResponse(new Uint8Array(file.buffer), {
            status: 200,
            headers: {
                'Content-Type': file.contentType,
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (err) {
        console.error('Avatar GET:', err);
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
}
