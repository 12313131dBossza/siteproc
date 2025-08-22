'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ padding: 16, color: '#eee', background: '#111', fontFamily: 'sans-serif' }}>
        <h2>Something went wrong</h2>
        <p style={{ opacity: 0.8 }}>An unexpected error occurred in the app shell.</p>
        {error?.message ? (
          <pre style={{ whiteSpace: 'pre-wrap', background: '#222', padding: 12, borderRadius: 6 }}>{error.message}</pre>
        ) : null}
        <button onClick={() => reset()} style={{ marginTop: 12 }}>Try again</button>
      </body>
    </html>
  )
}
