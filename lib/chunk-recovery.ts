'use client';

const RELOAD_KEY = 'stepay_chunk_reload';
const RELOAD_AT_KEY = 'stepay_chunk_reload_at';

/** Detect Next/webpack lazy-chunk failures (common after deploy with a stale tab). */
export function isChunkLoadError(err: unknown): boolean {
    if (!err) return false;
    const msg =
        err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : typeof (err as { message?: string }).message === 'string'
                ? (err as { message: string }).message
                : '';
    const name = err instanceof Error ? err.name : '';
    const lower = msg.toLowerCase();
    return (
        name === 'ChunkLoadError' ||
        msg.includes('Failed to load chunk') ||
        msg.includes('Loading chunk') ||
        msg.includes('Importing a module script failed') ||
        (lower.includes('loading css chunk') && lower.includes('failed')) ||
        (lower.includes('mime type') && lower.includes('text/plain'))
    );
}

/** Hard reload once per short window so users pick up fresh JS after deploy. */
export function reloadOnceForChunkError(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const last = Number(sessionStorage.getItem(RELOAD_AT_KEY) || 0);
        // Allow another hard reload after 15s if still broken (e.g. deploy in progress).
        if (sessionStorage.getItem(RELOAD_KEY) && Date.now() - last < 15_000) {
            return false;
        }
        sessionStorage.setItem(RELOAD_KEY, '1');
        sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()));
    } catch {
        // ignore storage failures
    }

    const url = new URL(window.location.href);
    url.searchParams.set('_r', String(Date.now()));
    window.location.replace(url.toString());
    return true;
}

export function clearChunkReloadFlag(): void {
    try {
        sessionStorage.removeItem(RELOAD_KEY);
        sessionStorage.removeItem(RELOAD_AT_KEY);
    } catch {
        // ignore
    }
}
