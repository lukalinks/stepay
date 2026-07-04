const RESEND_FROM = process.env.RESEND_FROM?.trim() || 'Stepay <onboarding@resend.dev>';
const SMTP_FROM =
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    'Stepay <noreply@stepay.pro>';

export type ConfirmAction = 'send' | 'sell' | 'swap' | 'signup' | 'admin-login';

const ACTION_LABELS: Record<ConfirmAction, string> = {
    send: 'confirm a crypto send',
    sell: 'confirm a cash out',
    swap: 'confirm a swap',
    signup: 'verify your email and create your Stepay account',
    'admin-login': 'sign in to the Stepay admin panel',
};

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) return false;

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
    });

    if (!res.ok) {
        const err = await res.text().catch(() => '');
        console.error('[email] Resend failed:', res.status, err);
        return false;
    }

    return true;
}

async function sendViaSmtp(to: string, subject: string, html: string): Promise<boolean> {
    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    if (!host || !user || !pass) return false;

    const port = Number(process.env.SMTP_PORT?.trim() || 465);
    const secure = process.env.SMTP_SECURE?.trim() !== 'false';

    try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
        });

        await transporter.sendMail({
            from: SMTP_FROM,
            to,
            subject,
            html,
        });
        return true;
    } catch (err) {
        console.error('[email] SMTP failed:', err);
        return false;
    }
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (await sendViaResend(to, subject, html)) return true;
    if (await sendViaSmtp(to, subject, html)) return true;
    return false;
}

export async function sendConfirmationCodeEmail(
    to: string,
    code: string,
    action: ConfirmAction
): Promise<boolean> {
    const label = ACTION_LABELS[action];
    const html = `
        <p>You requested to ${label} on Stepay.</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:0.2em;margin:24px 0">${code}</p>
        <p>This code expires in 10 minutes. If you did not request this, ignore this email.</p>
    `;
    return sendEmail(to, `Your Stepay confirmation code: ${code}`, html);
}

export async function sendPasswordResetEmail(to: string, link: string): Promise<boolean> {
    const html = `
        <p>You requested a password reset for your Stepay account.</p>
        <p><a href="${link}">Reset your password</a></p>
        <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
        <p style="color:#666;font-size:12px">If the button does not work, copy this URL: ${link}</p>
    `;
    return sendEmail(to, 'Reset your Stepay password', html);
}

type DepositEmailDetails = {
    to: string;
    amountFiat: string;
    amountCrypto: number;
    asset: string;
    reference: string;
    txHash?: string;
};

type DepositFailedEmailDetails = {
    to: string;
    amountFiat: string;
    amountCrypto: number;
    asset: string;
    reference: string;
    reason?: string;
};

function depositEmailShell(title: string, body: string): string {
    return `
        <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111;max-width:480px">
            <p style="font-size:18px;font-weight:700;margin:0 0 16px">${title}</p>
            ${body}
            <p style="color:#666;font-size:12px;margin-top:24px">Stepay · Mobile money to crypto</p>
        </div>
    `;
}

export async function sendDepositSuccessEmail(details: DepositEmailDetails): Promise<boolean> {
    const assetLabel = details.asset.toUpperCase();
    const cryptoStr = details.amountCrypto.toFixed(details.asset === 'usdc' ? 2 : 4);
    const html = depositEmailShell(
        'Deposit successful',
        `
            <p>Your deposit has been completed and credited to your Stepay wallet.</p>
            <table style="margin:20px 0;border-collapse:collapse;width:100%">
                <tr><td style="padding:6px 0;color:#666">Amount paid</td><td style="padding:6px 0;text-align:right;font-weight:600">${details.amountFiat}</td></tr>
                <tr><td style="padding:6px 0;color:#666">Received</td><td style="padding:6px 0;text-align:right;font-weight:600">${cryptoStr} ${assetLabel}</td></tr>
                <tr><td style="padding:6px 0;color:#666">Reference</td><td style="padding:6px 0;text-align:right;font-family:monospace;font-size:12px">${details.reference}</td></tr>
            </table>
            ${details.txHash ? `<p style="color:#666;font-size:12px">On-chain transaction: ${details.txHash}</p>` : ''}
            <p>You can view this deposit in your Stepay transaction history.</p>
        `
    );
    return sendEmail(details.to, `Deposit complete — ${cryptoStr} ${assetLabel}`, html);
}

export async function sendDepositFailedEmail(details: DepositFailedEmailDetails): Promise<boolean> {
    const assetLabel = details.asset.toUpperCase();
    const reason =
        details.reason?.trim() ||
        'Your mobile money payment was not completed. No funds were taken from your wallet.';
    const html = depositEmailShell(
        'Deposit could not be completed',
        `
            <p>We were unable to complete your deposit.</p>
            <table style="margin:20px 0;border-collapse:collapse;width:100%">
                <tr><td style="padding:6px 0;color:#666">Amount</td><td style="padding:6px 0;text-align:right;font-weight:600">${details.amountFiat}</td></tr>
                <tr><td style="padding:6px 0;color:#666">Asset</td><td style="padding:6px 0;text-align:right;font-weight:600">${assetLabel}</td></tr>
                <tr><td style="padding:6px 0;color:#666">Reference</td><td style="padding:6px 0;text-align:right;font-family:monospace;font-size:12px">${details.reference}</td></tr>
            </table>
            <p style="padding:12px;background:#fef2f2;border-radius:8px;color:#991b1b">${reason}</p>
            <p>You can try again from your Stepay dashboard. If money was deducted from your mobile money account, contact support with the reference above.</p>
        `
    );
    return sendEmail(details.to, 'Stepay deposit could not be completed', html);
}
