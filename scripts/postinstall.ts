/* Postinstall env guard: fails build if critical env vars missing */
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE',
  'APP_BASE_URL',
]

const missing: string[] = []
for (const k of required) {
  const v = process.env[k]
  if (!v || !v.trim()) missing.push(k)
}

if (missing.length) {
  console.warn('\n[postinstall] Missing required environment variables:')
  for (const m of missing) console.warn(' - ' + m)
  console.warn('\nCreate a .env.local based on .env.example before running the project.')
  if (process.env.CI === 'true') {
    console.error('[postinstall] Failing build in CI due to missing env vars.')
    process.exit(1)
  } else {
    console.warn('[postinstall] Continuing (non-CI).')
  }
} else {
  console.log('[postinstall] All required environment variables present.')
}
