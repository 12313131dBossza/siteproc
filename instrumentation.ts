export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry initialization
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime Sentry initialization
    await import('./sentry.edge.config')
  }
}

export async function onRequestError(err: Error) {
  // Import Sentry dynamically to avoid issues
  const Sentry = await import('@sentry/nextjs')
  Sentry.captureException(err)
}
