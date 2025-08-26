import { NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  return NextResponse.json({ user: session.user, companyId: session.companyId, role: session.role, profile: session.profile })
}