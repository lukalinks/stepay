import { sendConfirmationCodeEmail, type ConfirmAction } from '@/lib/email';

export type CodeDelivery = 'email' | 'dev';

export async function deliverConfirmCode(
    email: string,
    code: string,
    action: ConfirmAction
): Promise<{ delivery: CodeDelivery; maskedEmail?: string }> {
    const sent = await sendConfirmationCodeEmail(email, code, action);
    if (sent) {
        return { delivery: 'email', maskedEmail: maskEmail(email) };
    }

    if (process.env.NODE_ENV !== 'production') {
        console.info(`[confirm] dev mode — ${action} code for ${maskEmail(email)}: ${code}`);
        return { delivery: 'dev' };
    }

    throw new Error('Could not send confirmation email. Try again later or contact support.');
}

function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const visible = local.slice(0, 2);
    return `${visible}***@${domain}`;
}
