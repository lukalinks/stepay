import type { MobileOperatorId } from '@/lib/markets';

export type DepositTrackStep = 'awaiting_approval' | 'crediting' | 'waiting_trustline' | 'complete' | 'failed';

const STORAGE_KEY = 'stepay.activeDeposit';
const MAX_AGE_MS = 45 * 60 * 1000;

export type ActiveDepositSession = {
    reference: string;
    asset: 'xlm' | 'usdc';
    amount: number;
    phone: string;
    operator: MobileOperatorId;
    cryptoAmount: number;
    activationFiat: number;
    activationXlm: number;
    savedAt: number;
};

export function saveActiveDeposit(session: Omit<ActiveDepositSession, 'savedAt'>): void {
    if (typeof window === 'undefined') return;
    try {
        const payload: ActiveDepositSession = { ...session, savedAt: Date.now() };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // ignore quota / private mode
    }
}

export function loadActiveDeposit(): ActiveDepositSession | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as ActiveDepositSession;
        if (!parsed?.reference || !parsed.asset) {
            sessionStorage.removeItem(STORAGE_KEY);
            return null;
        }
        if (Date.now() - Number(parsed.savedAt || 0) > MAX_AGE_MS) {
            sessionStorage.removeItem(STORAGE_KEY);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

export function clearActiveDeposit(): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}

/** Map /api/deposit/confirm JSON into a tracker step. */
export function mapConfirmToDepositStep(data: {
    status?: string;
    lencoStatus?: string | null;
    dbStatus?: string;
    completed?: boolean;
}): DepositTrackStep | null {
    if (!data) return null;
    if (data.lencoStatus === 'failed' || data.lencoStatus === 'cancelled' || data.lencoStatus === 'failure') {
        return 'failed';
    }
    if (data.completed || data.status === 'completed') return 'complete';
    if (data.status === 'waiting_trustline') return 'waiting_trustline';
    if (data.status === 'failed') return 'failed';
    if (
        data.status === 'crediting' ||
        data.dbStatus === 'PROCESSING' ||
        data.lencoStatus === 'successful' ||
        data.lencoStatus === 'success'
    ) {
        return 'crediting';
    }
    if (data.status === 'pending') return 'awaiting_approval';
    return null;
}

export function depositFailureCopy(data: {
    status?: string;
    lencoStatus?: string | null;
}): string {
    const lenco = (data.lencoStatus || '').toLowerCase();
    if (lenco === 'failed' || lenco === 'cancelled' || lenco === 'failure') {
        return 'Your mobile money payment was declined, cancelled, or expired. No crypto was sent — you can try again.';
    }
    return 'We received your payment but could not finish sending crypto yet. Stay on this page or open Deposit again — we will keep retrying automatically.';
}
