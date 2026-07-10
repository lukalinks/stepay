import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { resolvePhoneRecipient, formatDisplayPhone } from '@/lib/phone-pay';
import { normalizeZambianPhone } from '@/lib/phone';

export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
        if (!phone || phone.replace(/\D/g, '').length < 9) {
            return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 });
        }

        const recipient = await resolvePhoneRecipient(phone, userId);
        const normalized = normalizeZambianPhone(phone);

        if (recipient.kind === 'user') {
            return NextResponse.json({
                registered: true,
                displayPhone: formatDisplayPhone(normalized),
                displayName: recipient.displayName,
            });
        }

        return NextResponse.json({
            registered: false,
            displayPhone: formatDisplayPhone(normalized),
            message: 'They will receive a link to claim after you send.',
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Lookup failed';
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}
