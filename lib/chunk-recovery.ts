'use client';

const RELOAD_KEY = 'stepay_chunk_reload';

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
    return (
        name === 'ChunkLoadError' ||
        msg.includes('Failed to load chunk') ||
        msg.includes('Loading chunk') ||
        msg.includes('Importing a module script failed')
    );
}

/** Reload once per session so users pick up fresh JS after deploy. */
export function reloadOnceForChunkError(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        if (sessionStorage.getItem(RELOAD_KEY)) return false;
        sessionStorage.setItem(RELOAD_KEY, '1');
        window.location.reload();
        return true;
    } catch {
        window.location.reload();
        return true;
    }
}

export function clearChunkReloadFlag(): void {
    try {
        sessionStorage.removeItem(RELOAD_KEY);
    } catch {
        // ignore
    }
}
