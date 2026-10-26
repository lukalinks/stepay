'use client';

import { useEffect } from 'react';
import { isChunkLoadError, reloadOnceForChunkError } from '@/lib/chunk-recovery';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunkError = isChunkLoadError(error);

  useEffect(() => {
    if (chunkError) {
      reloadOnceForChunkError();
    }
  }, [chunkError]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#070b12',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          {chunkError ? 'Stepay was just updated' : 'Something went wrong'}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, marginBottom: 20 }}>
          {chunkError
            ? 'Please refresh to load the latest version. Your account and wallet are safe.'
            : 'An unexpected error occurred. Try refreshing the page.'}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              if (chunkError) {
                window.location.reload();
                return;
              }
              reset();
            }}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '12px 20px',
              fontWeight: 700,
              cursor: 'pointer',
              background: '#5eead4',
              color: '#042f2e',
            }}
          >
            Refresh
          </button>
          <a
            href="/dashboard"
            style={{
              borderRadius: 999,
              padding: '12px 20px',
              fontWeight: 600,
              textDecoration: 'none',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
