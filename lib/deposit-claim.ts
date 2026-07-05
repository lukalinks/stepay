import { sql } from '@/lib/db';

/** Atomically claim a pending mobile-money collection (deposit or checkout). */
export async function claimPendingCollectionTransaction(
    reference: string
): Promise<Record<string, unknown> | null> {
    const rows = await sql`
        UPDATE transactions
        SET status = 'PROCESSING', updated_at = NOW()
        WHERE reference = ${reference} AND type IN ('BUY', 'CHECKOUT_MM') AND status = 'PENDING'
        RETURNING *
    `;
    return (rows[0] as Record<string, unknown> | undefined) ?? null;
}

/** @deprecated use claimPendingCollectionTransaction */
export async function claimPendingBuyTransaction(
    reference: string
): Promise<Record<string, unknown> | null> {
    return claimPendingCollectionTransaction(reference);
}
export async function completeBuyTransaction(id: string, txHash: string): Promise<void> {
    await sql`
        UPDATE transactions
        SET status = 'COMPLETED', tx_hash = ${txHash}, updated_at = NOW()
        WHERE id = ${id} AND status = 'PROCESSING'
    `;
}

export async function failBuyTransaction(id: string): Promise<boolean> {
    const rows = await sql`
        UPDATE transactions
        SET status = 'FAILED', updated_at = NOW()
        WHERE id = ${id} AND status = 'PROCESSING'
        RETURNING *
    `;
    return !!rows[0];
}

export async function failCollectionTransactionByReference(reference: string): Promise<Record<string, unknown> | null> {
    const rows = await sql`
        UPDATE transactions
        SET status = 'FAILED', updated_at = NOW()
        WHERE reference = ${reference} AND type IN ('BUY', 'CHECKOUT_MM') AND status IN ('PENDING', 'PROCESSING')
        RETURNING *
    `;
    return (rows[0] as Record<string, unknown> | undefined) ?? null;
}

/** @deprecated use failCollectionTransactionByReference */
export async function failBuyTransactionByReference(reference: string): Promise<Record<string, unknown> | null> {
    return failCollectionTransactionByReference(reference);
}

/** Idempotent skip when deposit already finished or in progress. */
export async function findCollectionTransactionByReference(reference: string): Promise<Record<string, unknown> | null> {
    const rows = await sql`
        SELECT * FROM transactions WHERE reference = ${reference} AND type IN ('BUY', 'CHECKOUT_MM') LIMIT 1
    `;
    return (rows[0] as Record<string, unknown> | undefined) ?? null;
}

/** @deprecated use findCollectionTransactionByReference */
export async function findBuyTransactionByReference(reference: string): Promise<Record<string, unknown> | null> {
    return findCollectionTransactionByReference(reference);
}
