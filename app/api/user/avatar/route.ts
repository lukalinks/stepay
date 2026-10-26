import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { avatarPublicPath, deleteUserAvatar, saveUserAvatar } from '@/lib/avatar-storage';
import { assertRateLimit, RateLimitError, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { clientIp } from '@/lib/signer';

/** Upload or replace the logged-in user's profile picture. */
export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ip = clientIp(request) || 'unknown';
        await assertRateLimit(rateLimitKey('avatar-upload', [ip, userId]), 20, 60 * 60 * 1000);

        const form = await request.formData();
        const file = form.get('file') ?? form.get('avatar');
        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'Choose an image file' }, { status: 400 });
        }

        const mime = file.type || 'application/octet-stream';
        const buffer = Buffer.from(await file.arrayBuffer());
        const { url } = await saveUserAvatar(userId, buffer, mime);

        await sql`
            UPDATE users SET avatar_url = ${url}, updated_at = NOW()
            WHERE id = ${userId}
        `;

        return NextResponse.json({ ok: true, avatarUrl: `${url}?v=${Date.now()}` });
    } catch (err) {
        if (err instanceof RateLimitError) {
            const r = rateLimitResponse(err);
            return NextResponse.json({ error: r.error }, { status: r.status });
        }
        const msg = err instanceof Error ? err.message : 'Upload failed';
        const status = msg.includes('JPG') || msg.includes('2 MB') || msg.includes('image') ? 400 : 500;
        if (status === 500) console.error('Avatar upload:', err);
        return NextResponse.json({ error: msg }, { status });
    }
}

/** Remove profile picture. */
export async function DELETE(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await deleteUserAvatar(userId);
        await sql`
            UPDATE users SET avatar_url = NULL, updated_at = NOW()
            WHERE id = ${userId}
        `;
        return NextResponse.json({ ok: true, avatarUrl: null });
    } catch (err) {
        console.error('Avatar delete:', err);
        return NextResponse.json({ error: 'Could not remove photo' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ avatarUrl: avatarPublicPath(userId) });
}
