import { sql } from '@/lib/db';

/** Atomically claim a pending BUY so only one worker credits the deposit. */
export async function claimPendingBuyTransaction(
    reference: string
): Promise<Record<string, unknown> | null> {
    const rows = await sql`
        UPDATE transactions
        SET status = 'PROCESSING', updated_at = NOW()
        WHERE reference = ${reference} AND type = 'BUY' AND status = 'PENDING'
        RETURNING *
    `;
    return (rows[0] as Record<string, unknown> | undefined) ?? null;
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

/** Mark a pending or processing BUY deposit as failed (idempotent). */
export async function failBuyTransactionByReference(reference: string): Promise<Record<string, unknown> | null> {
    const rows = await sql`
        UPDATE transactions
        SET status = 'FAILED', updated_at = NOW()
        WHERE reference = ${reference} AND type = 'BUY' AND status IN ('PENDING', 'PROCESSING')
        RETURNING *
    `;
    return (rows[0] as Record<string, unknown> | undefined) ?? null;
}

/** Idempotent skip when deposit already finished or in progress. */
export async function findBuyTransactionByReference(reference: string): Promise<Record<string, unknown> | null> {
    const rows = await sql`
        SELECT * FROM transactions WHERE reference = ${reference} AND type = 'BUY' LIMIT 1
    `;
    return (rows[0] as Record<string, unknown> | undefined) ?? null;
}
