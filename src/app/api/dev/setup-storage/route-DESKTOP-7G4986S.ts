import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { ensureDev } from '@/lib/devGuard'

export const runtime = 'nodejs'

async function setup() {
  const sb = supabaseService()
  // Create buckets if they don't exist
  async function ensureBucket(name: string, isPublic: boolean) {
    const { data: list } = await sb.storage.listBuckets()
    const exists = list?.some((b) => b.name === name)
    if (!exists) {
      await sb.storage.createBucket(name, { public: isPublic })
    }
  }

  await ensureBucket('public', true)
  await ensureBucket('private', false)

  return NextResponse.json({ ok: true })
}

export async function POST() {
  const guard = ensureDev(); if (guard) return guard
  return setup()
}

export async function GET() {
  const guard = ensureDev(); if (guard) return guard
  return setup()
}
