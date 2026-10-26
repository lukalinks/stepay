/** Shared transaction status labels for admin + dashboard UI. */

export type TxStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'default';

/** Human-readable transaction type (DB still uses BUY / SELL). */
export function formatTxType(type?: string | null): string {
    const t = (type || '').toUpperCase();
    if (t === 'BUY') return 'Top-up';
    if (t === 'SELL') return 'Payout';
    if (t === 'SEND') return 'Send';
    if (t === 'SWAP') return 'Swap';
    if (t === 'RECEIVE') return 'Receive';
    if (t === 'CHECKOUT_MM') return 'Checkout';
    if (t === 'DEPOSIT') return 'Top-up';
    if (t === 'WITHDRAW') return 'Payout';
    if (!type) return 'Unknown';
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

export function formatTxStatus(
    status: string,
    type?: string,
    asset?: string
): string {
    const s = (status || '').toUpperCase();
    const t = (type || '').toUpperCase();
    const a = (asset || '').toLowerCase();

    if (s === 'COMPLETED') return 'Completed';
    if (s === 'FAILED') return 'Failed';
    if (s === 'PAYOUT_FAILED') return 'Payout failed';

    if (s === 'PROCESSING') {
        if (t === 'BUY' && a === 'usdc') return 'Finishing USDC';
        if (t === 'BUY') return 'Crediting wallet';
        if (t === 'SELL') return 'Sending payout';
        if (t === 'SWAP') return 'Swapping';
        if (t === 'SEND') return 'Sending';
        return 'In progress';
    }

    if (s === 'PENDING') {
        if (t === 'BUY' || t === 'CHECKOUT_MM') return 'Awaiting top-up';
        if (t === 'SELL') return 'Awaiting payout';
        if (t === 'SWAP') return 'Queued';
        if (t === 'SEND') return 'Queued';
        return 'Awaiting';
    }

    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function txStatusTone(status: string): TxStatusTone {
    const s = (status || '').toUpperCase();
    if (s === 'COMPLETED') return 'success';
    if (s === 'FAILED' || s === 'PAYOUT_FAILED') return 'danger';
    if (s === 'PROCESSING') return 'info';
    if (s === 'PENDING') return 'warning';
    return 'default';
}

/** Whether ops can retry finalize from the admin drawer. */
export function isRetryableTxStatus(status: string, type?: string, txHash?: string | null): boolean {
    const s = (status || '').toUpperCase();
    const t = (type || '').toUpperCase();
    if (s === 'PENDING' || s === 'PROCESSING') return true;
    if (s === 'PAYOUT_FAILED' && t === 'SELL') return true;
    if (s === 'FAILED' && t === 'BUY' && !txHash) return true;
    return false;
}
