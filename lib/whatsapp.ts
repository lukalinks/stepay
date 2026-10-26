import { normalizeZambianPhone } from '@/lib/phone';

const GRAPH_API = 'https://graph.facebook.com/v21.0';

export function isWhatsAppConfigured(): boolean {
    return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** WhatsApp Cloud API expects digits only (no +). */
export function toWhatsAppRecipient(phone: string): string {
    return normalizeZambianPhone(phone);
}

function defaultTemplateName(): string {
    return process.env.WHATSAPP_TEMPLATE_ALERT?.trim() || 'stepay_alert';
}

/**
 * Send an approved template message (required for proactive outbound notifications).
 * Create template in Meta Business Manager, e.g. body: "{{1}}" named `stepay_alert`.
 */
export async function sendWhatsAppTemplateMessage(opts: {
    to: string;
    bodyText: string;
    templateName?: string;
}): Promise<boolean> {
    const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
    if (!token || !phoneNumberId) return false;

    const to = toWhatsAppRecipient(opts.to);
    if (!/^260[0-9]{9}$/.test(to)) {
        console.warn('[whatsapp] invalid recipient:', opts.to);
        return false;
    }

    const body = opts.bodyText.trim().slice(0, 1000);
    if (!body) return false;

    try {
        const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to,
                type: 'template',
                template: {
                    name: opts.templateName ?? defaultTemplateName(),
                    language: { code: process.env.WHATSAPP_TEMPLATE_LANG?.trim() || 'en' },
                    components: [
                        {
                            type: 'body',
                            parameters: [{ type: 'text', text: body }],
                        },
                    ],
                },
            }),
        });

        if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            console.error('[whatsapp] template send failed:', res.status, errBody.slice(0, 500));
            return false;
        }
        return true;
    } catch (err) {
        console.error('[whatsapp] template send error:', err);
        return false;
    }
}
