import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { createMerchantApiKey, listMerchantApiKeys, revokeMerchantApiKey } from '@/lib/merchant-auth';

export async function GET(request: Request) {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const keys = await listMerchantApiKeys(userId);
    return NextResponse.json({ keys });
}

export async function POST(request: Request) {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const name = typeof body.name === 'string' ? body.name : 'Default key';
        const created = await createMerchantApiKey(userId, name);
        return NextResponse.json({
            id: created.id,
            key: created.key,
            prefix: created.prefix,
            webhookSecret: created.webhookSecret,
            message: 'Copy your API key and webhook secret now — they will not be shown again.',
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create API key';
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}
