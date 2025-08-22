'use client'

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold">Error</h2>
      <p className="text-sm text-neutral-400">An unexpected error occurred.</p>
      {error?.message ? <pre className="mt-2 text-sm whitespace-pre-wrap">{error.message}</pre> : null}
      <button onClick={() => reset()} className="mt-3 underline text-blue-600">Try again</button>
    </div>
  )
}
