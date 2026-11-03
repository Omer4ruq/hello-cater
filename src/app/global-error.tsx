'use client';

/**
 * Last-resort boundary: catches errors in the root layout itself, so it
 * must render its own <html> and cannot rely on app styles loading.
 */
export default function GlobalError({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0, minHeight: '100dvh', display: 'grid', placeItems: 'center',
          background: '#ffffff', color: '#222222', padding: '2rem',
          fontFamily: 'Figtree, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <main style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.6rem', margin: '0 0 0.75rem' }}>Something went wrong</h1>
          <p style={{ color: '#5e5e5e', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
            The application failed to load. Please refresh the page. If the problem continues,
            contact support@eventlybd.com.
          </p>
          {error.digest ? (
            <p style={{ fontSize: '0.75rem', color: '#6a6a6a', fontFamily: 'monospace' }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              marginTop: '1rem', background: '#9b1c45', color: '#fff', border: 0,
              padding: '0.7rem 1.4rem', borderRadius: '9999px', fontSize: '0.95rem',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
