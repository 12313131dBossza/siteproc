import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'

export const runtime = 'nodejs'

// Only allow in development
function checkDevOnly() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }
  return null
}

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
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }
  return setup()
}

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }
  return setup()
}
