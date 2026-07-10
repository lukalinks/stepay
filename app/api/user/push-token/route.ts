import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({
    pushToken: z.string().min(1, 'Push token required'),
});

export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { pushToken } = schema.parse(body);

        await sql`
            UPDATE users SET push_token = ${pushToken} WHERE id = ${userId}
        `;

        return NextResponse.json({ success: true });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: err.errors[0]?.message ?? 'Invalid input' }, { status: 400 });
        }
        console.error('Push token API error:', err);
        return NextResponse.json({ error: 'Failed to register push token' }, { status: 500 });
    }
}
