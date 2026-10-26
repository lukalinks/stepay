'use client';

import { useEffect } from 'react';
import { clearChunkReloadFlag, isChunkLoadError, reloadOnceForChunkError } from '@/lib/chunk-recovery';

/** Auto-reload when a lazy JS/CSS chunk fails (e.g. right after a production deploy). */
export function ChunkLoadRecovery() {
    useEffect(() => {
        // Clear only after the page has stayed healthy briefly — avoids wiping the
        // "already reloaded" guard before a second chunk failure on the same load.
        const clearTimer = window.setTimeout(() => {
            clearChunkReloadFlag();
        }, 4000);

        const onRejection = (event: PromiseRejectionEvent) => {
            if (isChunkLoadError(event.reason)) {
                event.preventDefault();
                reloadOnceForChunkError();
            }
        };

        const onError = (event: ErrorEvent) => {
            const msg = String(event.message || '');
            if (isChunkLoadError(event.error ?? msg) || msg.includes('ChunkLoadError')) {
                event.preventDefault();
                reloadOnceForChunkError();
            }
        };

        window.addEventListener('unhandledrejection', onRejection);
        window.addEventListener('error', onError);
        return () => {
            window.clearTimeout(clearTimer);
            window.removeEventListener('unhandledrejection', onRejection);
            window.removeEventListener('error', onError);
        };
    }, []);

    return null;
}
