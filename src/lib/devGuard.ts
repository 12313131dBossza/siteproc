import { NextResponse } from 'next/server'

// Simple guard to disable /api/dev/* endpoints unless explicitly enabled.
// Add DEV_TOOLS_ENABLED=true to .env.local to allow using seeding/setup helpers locally.
export function ensureDev() {
  if (process.env.DEV_TOOLS_ENABLED === 'true') return undefined
  // Return 404 to avoid advertising the existence of these endpoints.
  return NextResponse.json({ error: 'Not Found' }, { status: 404 })
}
