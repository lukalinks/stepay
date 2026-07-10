import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { revokeMerchantApiKey } from '@/lib/merchant-auth';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const ok = await revokeMerchantApiKey(userId, id);
    if (!ok) {
        return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
}
