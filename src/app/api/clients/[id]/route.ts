import { NextRequest, NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'

export const runtime = 'nodejs'

// TODO: Implement real client fetch once schema exists.
export async function GET(req: NextRequest, ctx: any) {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const id = ctx?.params?.id
  return NextResponse.json({ id, note: 'client schema pending' })
}
