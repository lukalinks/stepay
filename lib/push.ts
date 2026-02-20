/**
 * Send push notifications via Expo Push API.
 * No auth required - Expo Push Service is free.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendPushNotification(
    pushToken: string | null | undefined,
    title: string,
    body: string,
    data?: Record<string, unknown>
): Promise<void> {
    if (!pushToken || typeof pushToken !== 'string' || !pushToken.startsWith('ExponentPushToken[')) {
        return;
    }

    try {
        const res = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                to: pushToken,
                title,
                body,
                sound: 'default',
                ...(data && Object.keys(data).length > 0 ? { data } : {}),
            }),
        });

        if (!res.ok) {
            const text = await res.text();
            console.error('Expo push failed:', res.status, text);
        }
    } catch (err) {
        console.error('Expo push error:', err);
    }
}
