import postgres from 'postgres';
import { sql } from '@/lib/db';
import { coerceIntentPayload } from '@/lib/intent-payload';
import { decryptWalletSecret, encryptWalletSecret, generateConfirmCode, hashConfirmCode } from '@/lib/wallet-crypto';

export type SignIntentType = 'SEND' | 'SELL' | 'SWAP';

const INTENT_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export type SignIntentRow = {
    id: string;
    user_id: string;
    type: SignIntentType;
    payload: Record<string, unknown>;
    status: string;
    attempts: number;
    expires_at: string;
};

export async function createSignIntent(
    userId: string,
    type: SignIntentType,
    payload: Record<string, unknown>
): Promise<{ intentId: string; expiresAt: string; confirmCode: string }> {
    const confirmCode = generateConfirmCode();
    const salt = `${userId}:${Date.now()}`;
    const confirmCodeHash = hashConfirmCode(confirmCode, salt);
    const expiresAt = new Date(Date.now() + INTENT_TTL_MS).toISOString();

    const rows = await sql`
        INSERT INTO sign_intents (user_id, type, payload, confirm_code_hash, expires_at)
        VALUES (
            ${userId},
            ${type},
            ${sql.json(payload as Record<string, postgres.JSONValue>)},
            ${salt + '|' + confirmCodeHash},
            ${expiresAt}
        )
        RETURNING id
    `;
    const intentId = (rows[0] as { id: string }).id;

    return { intentId, expiresAt, confirmCode };
}

type IntentRowWithHash = SignIntentRow & { confirm_code_hash: string };

type VerifyIntentOpts = {
    intentId: string;
    userId: string;
    confirmCode: string;
    nextStatus: 'used' | 'confirmed';
    clientPlan?: Record<string, unknown>;
};

async function verifyIntentInternal(opts: VerifyIntentOpts): Promise<SignIntentRow> {
    const normalizedCode = opts.confirmCode.replace(/\D/g, '');

    return sql.begin(async (tx) => {
        const rows = await tx`
            SELECT * FROM sign_intents
            WHERE id = ${opts.intentId} AND user_id = ${opts.userId}
            FOR UPDATE
        `;
        const row = rows[0] as IntentRowWithHash | undefined;
        if (!row) {
            throw new Error('Confirmation request not found.');
        }

        if (row.status === 'used') {
            throw new Error('This confirmation was already used.');
        }
        if (row.status !== 'pending') {
            throw new Error('This confirmation request is no longer valid.');
        }
        if (new Date(row.expires_at).getTime() < Date.now()) {
            await tx`UPDATE sign_intents SET status = 'expired' WHERE id = ${opts.intentId}`;
            throw new Error('Confirmation code expired. Please start again.');
        }

        const [salt, expectedHash] = row.confirm_code_hash.split('|');
        if (!salt || !expectedHash) {
            throw new Error('Invalid confirmation state.');
        }

        const actualHash = hashConfirmCode(normalizedCode, salt);
        if (actualHash !== expectedHash) {
            const attempts = Number(row.attempts) + 1;
            await tx`
                UPDATE sign_intents SET attempts = ${attempts}
                WHERE id = ${opts.intentId}
            `;
            if (attempts >= MAX_ATTEMPTS) {
                await tx`UPDATE sign_intents SET status = 'cancelled' WHERE id = ${opts.intentId}`;
                throw new Error('Too many incorrect codes. Please start again.');
            }
            throw new Error('Incorrect confirmation code.');
        }

        const basePayload = coerceIntentPayload(row.payload);
        const mergedPayload =
            opts.clientPlan != null
                ? { ...basePayload, _clientPlan: opts.clientPlan }
                : basePayload;

        const updated = await tx`
            UPDATE sign_intents
            SET status = ${opts.nextStatus}, confirmed_at = NOW(), payload = ${sql.json(mergedPayload as Record<string, postgres.JSONValue>)}
            WHERE id = ${opts.intentId} AND user_id = ${opts.userId} AND status = 'pending'
            RETURNING *
        `;
        const consumed = updated[0] as SignIntentRow | undefined;
        if (!consumed) {
            throw new Error('This confirmation was already used.');
        }

        return consumed;
    });
}

/** Atomically verify OTP and mark intent used — prevents replay and parallel double-spend. */
export async function verifyAndConsumeIntent(
    intentId: string,
    userId: string,
    confirmCode: string
): Promise<SignIntentRow> {
    return verifyIntentInternal({ intentId, userId, confirmCode, nextStatus: 'used' });
}

/** Verify OTP and mark intent confirmed — client signs next, then finalize consumes it. */
export async function verifyIntentForClientSign(
    intentId: string,
    userId: string,
    confirmCode: string,
    clientPlan: Record<string, unknown>
): Promise<SignIntentRow> {
    return verifyIntentInternal({ intentId, userId, confirmCode, nextStatus: 'confirmed', clientPlan });
}

export async function consumeConfirmedIntent(intentId: string, userId: string): Promise<SignIntentRow> {
    return sql.begin(async (tx) => {
        const rows = await tx`
            SELECT * FROM sign_intents
            WHERE id = ${intentId} AND user_id = ${userId}
            FOR UPDATE
        `;
        const row = rows[0] as SignIntentRow | undefined;
        if (!row) throw new Error('Confirmation request not found.');
        if (row.status === 'used') throw new Error('This confirmation was already used.');
        if (row.status !== 'confirmed') throw new Error('Confirmation is not ready to finalize.');
        if (new Date(row.expires_at).getTime() < Date.now()) {
            await tx`UPDATE sign_intents SET status = 'expired' WHERE id = ${intentId}`;
            throw new Error('Confirmation expired. Please start again.');
        }

        const updated = await tx`
            UPDATE sign_intents
            SET status = 'used'
            WHERE id = ${intentId} AND user_id = ${userId} AND status = 'confirmed'
            RETURNING *
        `;
        const consumed = updated[0] as SignIntentRow | undefined;
        if (!consumed) throw new Error('This confirmation was already used.');
        return consumed;
    });
}

export function readClientPlan(intent: SignIntentRow): Record<string, unknown> | null {
    const payload = coerceIntentPayload(intent.payload);
    const plan = payload._clientPlan;
    return plan && typeof plan === 'object' && !Array.isArray(plan) ? (plan as Record<string, unknown>) : null;
}

/** Re-verify OTP for a confirmed client-sign intent (page refresh) — still requires the email code. */
export async function reverifyConfirmedIntentCode(
    intentId: string,
    userId: string,
    confirmCode: string
): Promise<SignIntentRow> {
    const normalizedCode = confirmCode.replace(/\D/g, '');

    return sql.begin(async (tx) => {
        const rows = await tx`
            SELECT * FROM sign_intents
            WHERE id = ${intentId} AND user_id = ${userId}
            FOR UPDATE
        `;
        const row = rows[0] as IntentRowWithHash | undefined;
        if (!row) {
            throw new Error('Confirmation request not found.');
        }
        if (row.status !== 'confirmed') {
            throw new Error('This confirmation request is no longer valid.');
        }
        if (new Date(row.expires_at).getTime() < Date.now()) {
            await tx`UPDATE sign_intents SET status = 'expired' WHERE id = ${intentId}`;
            throw new Error('Confirmation code expired. Please start again.');
        }

        const [salt, expectedHash] = row.confirm_code_hash.split('|');
        if (!salt || !expectedHash) {
            throw new Error('Invalid confirmation state.');
        }

        const actualHash = hashConfirmCode(normalizedCode, salt);
        if (actualHash !== expectedHash) {
            throw new Error('Incorrect confirmation code.');
        }

        return row;
    });
}

export { encryptWalletSecret, decryptWalletSecret };
