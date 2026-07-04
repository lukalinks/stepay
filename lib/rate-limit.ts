import { sql } from '@/lib/db';

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * Postgres-backed sliding-window rate limiter (safe across serverless instances).
 */
export async function checkRateLimit(
    bucketKey: string,
    maxAttempts: number,
    windowMs: number
): Promise<RateLimitResult> {
    const since = new Date(Date.now() - windowMs).toISOString();

    const countRows = await sql`
        SELECT COUNT(*)::int AS c FROM rate_limit_events
        WHERE bucket_key = ${bucketKey} AND created_at >= ${since}
    `;
    const count = Number((countRows[0] as { c: number })?.c ?? 0);

    if (count >= maxAttempts) {
        const oldestRows = await sql`
            SELECT created_at FROM rate_limit_events
            WHERE bucket_key = ${bucketKey} AND created_at >= ${since}
            ORDER BY created_at ASC
            LIMIT 1
        `;
        const oldest = (oldestRows[0] as { created_at: Date | string } | undefined)?.created_at;
        const oldestMs = oldest ? new Date(oldest).getTime() : Date.now();
        const retryAfterSec = Math.max(1, Math.ceil((oldestMs + windowMs - Date.now()) / 1000));
        return { ok: false, retryAfterSec };
    }

    await sql`INSERT INTO rate_limit_events (bucket_key) VALUES (${bucketKey})`;

    // Best-effort cleanup of stale rows (ignore errors)
    const cleanupBefore = new Date(Date.now() - windowMs * 2).toISOString();
    sql`DELETE FROM rate_limit_events WHERE created_at < ${cleanupBefore}`.catch(() => {});

    return { ok: true };
}

export async function assertRateLimit(
    bucketKey: string,
    maxAttempts: number,
    windowMs: number,
    message = 'Too many attempts. Please wait and try again.'
): Promise<void> {
    const result = await checkRateLimit(bucketKey, maxAttempts, windowMs);
    if (!result.ok) {
        throw new RateLimitError(message, result.retryAfterSec);
    }
}

export class RateLimitError extends Error {
    retryAfterSec: number;

    constructor(message: string, retryAfterSec: number) {
        super(message);
        this.name = 'RateLimitError';
        this.retryAfterSec = retryAfterSec;
    }
}

export function rateLimitResponse(err: RateLimitError) {
    return {
        error: err.message,
        retryAfterSec: err.retryAfterSec,
        status: 429 as const,
    };
}

/** Build a bucket key from route + optional user/ip identifiers. */
export function rateLimitKey(route: string, parts: (string | null | undefined)[]): string {
    return [route, ...parts.filter(Boolean)].join(':');
}
