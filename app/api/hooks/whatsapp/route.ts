import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';

function verifyToken(): string {
    return process.env.WHATSAPP_VERIFY_TOKEN?.trim() || '';
}

/** GET — Meta webhook verification */
export async function GET(req: Request) {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const expected = verifyToken();

    if (mode === 'subscribe' && token && expected && token === expected && challenge) {
        return new NextResponse(challenge, { status: 200 });
    }

    return NextResponse.json({
        ok: true,
        webhook: 'whatsapp',
        message: 'Stepay WhatsApp webhook. Configure GET verify + POST events in Meta.',
    });
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
    const secret = process.env.WHATSAPP_APP_SECRET?.trim();
    if (!secret || !signatureHeader?.startsWith('sha256=')) return !secret;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const received = signatureHeader.slice(7);
    try {
        return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
    } catch {
        return false;
    }
}

/** POST — inbound message + delivery status events (logged; extend for bot later) */
export async function POST(req: Request) {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    if (process.env.WHATSAPP_APP_SECRET && !verifySignature(rawBody, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    try {
        const payload = JSON.parse(rawBody) as {
            entry?: Array<{
                changes?: Array<{
                    value?: {
                        messages?: Array<{ from?: string; type?: string; text?: { body?: string } }>;
                        statuses?: Array<{ id?: string; status?: string; recipient_id?: string }>;
                    };
                }>;
            }>;
        };

        for (const entry of payload.entry ?? []) {
            for (const change of entry.changes ?? []) {
                const value = change.value;
                for (const msg of value?.messages ?? []) {
                    console.info('[whatsapp] inbound', msg.from, msg.type, msg.text?.body?.slice(0, 120));
                }
                for (const status of value?.statuses ?? []) {
                    console.info('[whatsapp] status', status.recipient_id, status.status, status.id);
                }
            }
        }
    } catch (err) {
        console.error('[whatsapp] webhook parse error:', err);
    }

    return NextResponse.json({ ok: true });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
