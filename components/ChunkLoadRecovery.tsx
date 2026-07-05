'use client';

import { useEffect } from 'react';
import { clearChunkReloadFlag, isChunkLoadError, reloadOnceForChunkError } from '@/lib/chunk-recovery';

/** Auto-reload once when a lazy JS chunk fails (e.g. after production deploy). */
export function ChunkLoadRecovery() {
    useEffect(() => {
        clearChunkReloadFlag();

        const onRejection = (event: PromiseRejectionEvent) => {
            if (isChunkLoadError(event.reason)) {
                event.preventDefault();
                reloadOnceForChunkError();
            }
        };

        const onError = (event: ErrorEvent) => {
            if (isChunkLoadError(event.error ?? event.message)) {
                event.preventDefault();
                reloadOnceForChunkError();
            }
        };

        window.addEventListener('unhandledrejection', onRejection);
        window.addEventListener('error', onError);
        return () => {
            window.removeEventListener('unhandledrejection', onRejection);
            window.removeEventListener('error', onError);
        };
    }, []);

    return null;
}
