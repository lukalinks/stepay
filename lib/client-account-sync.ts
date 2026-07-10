import { clearAccountLocalState } from '@/lib/client-wallet';

const ACTIVE_USER_KEY = 'stepay_active_user_id';
const EXPECTED_USER_KEY = 'stepay_expected_user_id';

/** After signup, the client expects this user id until profile confirms it. */
export function setExpectedUserId(userId: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(EXPECTED_USER_KEY, userId);
    sessionStorage.setItem(ACTIVE_USER_KEY, userId);
}

/**
 * Returns true when the server session does not match the account we just created (stale cookie).
 * Caller should log out and redirect to login.
 */
export function isStaleSessionAfterSignup(serverUserId: string): boolean {
    if (typeof window === 'undefined') return false;
    const expected = sessionStorage.getItem(EXPECTED_USER_KEY);
    if (!expected) return false;
    if (expected === serverUserId) {
        sessionStorage.removeItem(EXPECTED_USER_KEY);
        return false;
    }
    return true;
}

/**
 * Clears local wallet state when the signed-in user changes (e.g. account switch on same device).
 * Returns true if the user changed and local state was cleared.
 */
export function syncClientAccountSession(userId: string): boolean {
    if (typeof window === 'undefined') return false;
    const expected = sessionStorage.getItem(EXPECTED_USER_KEY);
    const prev = sessionStorage.getItem(ACTIVE_USER_KEY);
    sessionStorage.setItem(ACTIVE_USER_KEY, userId);

    // Fresh signup — wallet was just created on this device; do not wipe the vault.
    if (expected === userId) {
        sessionStorage.removeItem(EXPECTED_USER_KEY);
        return false;
    }

    if (prev && prev !== userId) {
        clearAccountLocalState();
        sessionStorage.setItem(ACTIVE_USER_KEY, userId);
        return true;
    }
    return false;
}

export function clearClientAccountSessionMarkers(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(ACTIVE_USER_KEY);
    sessionStorage.removeItem(EXPECTED_USER_KEY);
}
