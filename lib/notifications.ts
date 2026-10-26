import { isWhatsAppConfigured, sendWhatsAppTemplateMessage } from '@/lib/whatsapp';

async function sendTwilioSms(phone: string, message: string): Promise<boolean> {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM) {
        return false;
    }
    try {
        const auth = Buffer.from(
            `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString('base64');
        const to = phone.startsWith('+')
            ? phone
            : `+${phone.replace(/\D/g, '').replace(/^0/, '260')}`;
        const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    To: to.startsWith('+260') ? to : `+260${to.replace(/\D/g, '').slice(-9)}`,
                    From: process.env.TWILIO_FROM,
                    Body: message.slice(0, 320),
                }),
            }
        );
        return res.ok;
    } catch (err) {
        console.error('[sms] Twilio failed:', err);
        return false;
    }
}

/** WhatsApp template first, then Twilio SMS, then dev log. */
export async function deliverPhoneNotification(phone: string, message: string): Promise<void> {
    if (isWhatsAppConfigured()) {
        const sent = await sendWhatsAppTemplateMessage({ to: phone, bodyText: message });
        if (sent) return;
    }

    const smsSent = await sendTwilioSms(phone, message);
    if (smsSent) return;

    console.info(`[notify] ${phone}: ${message}`);
}

/** Notify recipient of phone transfer — push handled separately. */
export async function notifyPhoneTransfer(opts: {
    recipientPhone: string;
    amount: number;
    asset: string;
    claimUrl: string;
    isRegistered: boolean;
    senderName?: string | null;
}): Promise<void> {
    const from = opts.senderName ?? 'Someone';
    const msg = opts.isRegistered
        ? `${from} sent you ${opts.amount} ${opts.asset.toUpperCase()} on Stepay. Open your wallet: ${opts.claimUrl}`
        : `${from} sent you ${opts.amount} ${opts.asset.toUpperCase()} on Stepay. Claim it: ${opts.claimUrl}`;

    await deliverPhoneNotification(opts.recipientPhone, msg);
}

export async function notifyMoneyRequest(opts: {
    payerPhone?: string | null;
    requesterName: string;
    amount: number;
    asset: string;
    payUrl: string;
}): Promise<void> {
    const msg = `${opts.requesterName} requested ${opts.amount} ${opts.asset.toUpperCase()} on Stepay: ${opts.payUrl}`;
    if (opts.payerPhone) {
        await deliverPhoneNotification(opts.payerPhone, msg);
    }
    console.info(`[request-money] ${msg}`);
}

export async function notifyDepositByPhone(opts: {
    phone: string;
    message: string;
}): Promise<void> {
    await deliverPhoneNotification(opts.phone, opts.message);
}

export async function notifySellPayout(opts: {
    phone: string;
    amountCrypto: number;
    assetLabel: string;
    amountFiat: number;
    reference: string;
}): Promise<void> {
    const msg = `Stepay: Sold ${opts.amountCrypto} ${opts.assetLabel}. ZMW ${opts.amountFiat.toFixed(2)} is being sent to your mobile money. Ref: ${opts.reference}`;
    await deliverPhoneNotification(opts.phone, msg);
}

export function inviteWhatsAppMessage(signupUrl: string): string {
    return `You're invited to Stepay closed beta. Create your account: ${signupUrl}`;
}

/** WhatsApp / SMS invite when a phone is on file. Returns whether Cloud API or SMS accepted the send. */
export async function notifyInvite(opts: {
    phone: string;
    signupUrl: string;
}): Promise<boolean> {
    const msg = inviteWhatsAppMessage(opts.signupUrl);
    if (isWhatsAppConfigured()) {
        const sent = await sendWhatsAppTemplateMessage({ to: opts.phone, bodyText: msg });
        if (sent) return true;
    }
    return sendTwilioSms(opts.phone, msg);
}

export { whatsAppShareUrl } from '@/lib/share';
