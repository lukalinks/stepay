export function confirmDeliveryHint(data: {
    codeDelivery?: string;
    maskedEmail?: string;
    devConfirmCode?: string;
}): string | undefined {
    if (data.devConfirmCode) return undefined;
    if (data.codeDelivery === 'email' && data.maskedEmail) {
        return `Code sent to ${data.maskedEmail}. Check your inbox (and spam).`;
    }
    if (data.codeDelivery === 'console') {
        return 'Email is not configured. Ask your administrator or check server logs.';
    }
    return 'Enter the 6-digit confirmation code.';
}
