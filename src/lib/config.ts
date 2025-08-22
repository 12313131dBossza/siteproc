import { z } from 'zod'

// Centralized environment configuration with validation & defaults.
const EnvSchema = z.object({
  PUBLIC_HMAC_SECRET: z.string().optional(),
  PUBLIC_HMAC_REQUIRE: z.enum(['true', 'false']).optional(),
  PUBLIC_HMAC_MAX_DRIFT_MS: z.string().optional(),
  PUBLIC_HMAC_ENFORCE_TS: z.enum(['true', 'false']).optional(),
  PUBLIC_CORS_ORIGINS: z.string().optional(),
  PUBLIC_TOKEN_MAX_ATTEMPTS: z.string().optional(),
  PUBLIC_TOKEN_LOCK_MS: z.string().optional(),
  PUBLIC_CO_ONE_TIME: z.enum(['true', 'false']).optional(),
  UPLOAD_IMAGE_MAX_BYTES: z.string().optional(),
  UPLOAD_IMAGE_ALLOWED_TYPES: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().optional(),
  RATE_LIMIT_MAX: z.string().optional(),
  CSP_ENFORCE: z.enum(['true', 'false']).optional(),
  CSP_SCRIPT_SRC: z.string().optional(),
})

type RawEnv = z.infer<typeof EnvSchema>

const raw = EnvSchema.parse(process.env) as RawEnv

function toNumber(val: string | undefined, def: number) {
  const n = val ? Number(val) : NaN
  return Number.isFinite(n) && n > 0 ? n : def
}

export const config = {
  hmacSecret: raw.PUBLIC_HMAC_SECRET || '',
  hmacRequire: raw.PUBLIC_HMAC_REQUIRE === 'true',
  hmacEnforceTs: raw.PUBLIC_HMAC_ENFORCE_TS === 'true',
  hmacMaxDriftMs: toNumber(raw.PUBLIC_HMAC_MAX_DRIFT_MS, 5 * 60_000),
  corsOrigins: (raw.PUBLIC_CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  tokenMaxAttempts: toNumber(raw.PUBLIC_TOKEN_MAX_ATTEMPTS, 5),
  tokenLockMs: toNumber(raw.PUBLIC_TOKEN_LOCK_MS, 15 * 60_000),
  coOneTime: raw.PUBLIC_CO_ONE_TIME === 'true',
  uploadImageMaxBytes: toNumber(raw.UPLOAD_IMAGE_MAX_BYTES, 2_000_000),
  uploadImageAllowedTypes: (raw.UPLOAD_IMAGE_ALLOWED_TYPES || 'image/png,image/jpeg,image/webp').split(',').map(s => s.trim()).filter(Boolean),
  cspEnforce: raw.CSP_ENFORCE === 'true',
  cspScriptSrc: raw.CSP_SCRIPT_SRC || "'self'",
}

export type AppConfig = typeof config
