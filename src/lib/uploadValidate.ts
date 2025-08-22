import { config } from './config'

const signatures: { type: string; magic: number[] }[] = [
  { type: 'image/png', magic: [0x89, 0x50, 0x4e, 0x47] },
  { type: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
  { type: 'image/webp', magic: [0x52, 0x49, 0x46, 0x46] },
]

export interface ImageValidationResult { ok: boolean; reason?: string; detectedType?: string }

export function validateImageBytes(buf: Buffer, claimedMime: string): ImageValidationResult {
  if (buf.length > config.uploadImageMaxBytes) return { ok: false, reason: 'too_large' }
  const head = Array.from(buf.slice(0, 8))
  let detected: string | undefined
  for (const sig of signatures) {
    if (sig.magic.every((b, i) => head[i] === b)) { detected = sig.type; break }
  }
  if (detected && detected !== claimedMime) {
    if (!config.uploadImageAllowedTypes.includes(detected)) return { ok: false, reason: 'mime_mismatch' }
  }
  const finalType = detected || claimedMime
  if (!config.uploadImageAllowedTypes.includes(finalType)) return { ok: false, reason: 'unsupported_type' }
  return { ok: true, detectedType: finalType }
}

export function parseDataUrl(dataUrl: string): { mime: string; buf: Buffer } {
  const m = dataUrl.match(/^data:(.*?);base64,(.*)$/)
  if (!m) throw new Error('bad data url')
  return { mime: m[1], buf: Buffer.from(m[2], 'base64') }
}
