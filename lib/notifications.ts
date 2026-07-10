/** Notify recipient of phone transfer — push handled separately; logs SMS in dev. */
export async function notifyPhoneTransfer(opts: {
    recipientPhone: string;
    amount: number;
    asset: 'xlm' | 'usdc';
    claimUrl: string;
    isRegistered: boolean;
    senderName?: string | null;
}): Promise<void> {
    const from = opts.senderName ?? 'Someone';
    const msg = opts.isRegistered
        ? `${from} sent you ${opts.amount} ${opts.asset.toUpperCase()} on Stepay. Open your wallet: ${opts.claimUrl}`
        : `${from} sent you ${opts.amount} ${opts.asset.toUpperCase()} on Stepay. Claim it: ${opts.claimUrl}`;

    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) {
        try {
            const auth = Buffer.from(
                `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
            ).toString('base64');
            const to = opts.recipientPhone.startsWith('+')
                ? opts.recipientPhone
                : `+${opts.recipientPhone.replace(/\D/g, '').replace(/^0/, '260')}`;
            await fetch(
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
                        Body: msg.slice(0, 320),
                    }),
                }
            );
            return;
        } catch (err) {
            console.error('[sms] Twilio failed:', err);
        }
    }

    console.info(`[sms] ${opts.recipientPhone}: ${msg}`);
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
        await notifyPhoneTransfer({
            recipientPhone: opts.payerPhone,
            amount: opts.amount,
            asset: opts.asset as 'xlm' | 'usdc',
            claimUrl: opts.payUrl,
            isRegistered: false,
            senderName: opts.requesterName,
        });
    }
    console.info(`[request-money] ${msg}`);
}

export { whatsAppShareUrl } from '@/lib/share';
