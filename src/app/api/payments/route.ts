import { NextRequest, NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

// TODO: Implement payments table queries when schema available.
export async function GET(req: NextRequest) {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  return NextResponse.json({ items: [], nextCursor: null, note: 'payments schema not yet implemented' })
}
