'use client';

import { useEffect } from 'react';
import { isChunkLoadError, reloadOnceForChunkError } from '@/lib/chunk-recovery';

export default function GlobalError({
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
    <html lang="en">
      <body style={{ margin: 0, background: '#070b12', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              {chunkError ? 'Stepay was just updated' : 'Something went wrong'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, marginBottom: 20 }}>
              {chunkError
                ? 'Refresh to load the latest version. Your signup and wallet are safe.'
                : 'Please refresh and try again.'}
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/dashboard?welcome=1';
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
              Refresh & continue
            </button>
            {!chunkError && (
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  display: 'block',
                  margin: '12px auto 0',
                  border: 0,
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.55)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
