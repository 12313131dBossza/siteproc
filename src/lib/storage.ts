import { supabaseService } from './supabase'

const PUBLIC_BUCKET = 'public'
const PRIVATE_BUCKET = 'private'

export async function uploadPublic(path: string, bytes: ArrayBuffer | Buffer, contentType: string) {
  const sb = supabaseService()
  const { error } = await sb.storage.from(PUBLIC_BUCKET).upload(path, bytes, { upsert: true, contentType })
  if (error) throw error
  const { data } = sb.storage.from(PUBLIC_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function uploadPrivateSigned(path: string, bytes: ArrayBuffer | Buffer, contentType: string, expiresInSeconds = 60 * 60) {
  const sb = supabaseService()
  const { error } = await sb.storage.from(PRIVATE_BUCKET).upload(path, bytes, { upsert: true, contentType })
  if (error) throw error
  const { data, error: urlErr } = await sb.storage.from(PRIVATE_BUCKET).createSignedUrl(path, expiresInSeconds)
  if (urlErr) throw urlErr
  return data.signedUrl
}
