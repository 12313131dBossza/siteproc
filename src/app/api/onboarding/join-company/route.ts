import { NextResponse } from 'next/server'

// Deprecated endpoint retained temporarily; instruct clients to use /api/onboarding/join
export async function POST() {
  return NextResponse.json({ error: 'deprecated_use_/api/onboarding/join' }, { status: 410 })
}
export async function GET() {
  return NextResponse.json({ error: 'deprecated' }, { status: 410 })
}
