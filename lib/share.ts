import { normalizeZambianPhone } from '@/lib/phone';

export function whatsAppShareUrl(text: string, recipientPhone?: string | null): string {
    const encoded = encodeURIComponent(text);
    if (recipientPhone?.trim()) {
        const digits = normalizeZambianPhone(recipientPhone);
        if (/^260[0-9]{9}$/.test(digits)) {
            return `https://wa.me/${digits}?text=${encoded}`;
        }
    }
    return `https://wa.me/?text=${encoded}`;
}
