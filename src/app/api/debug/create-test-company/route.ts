import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI"
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!url) return NextResponse.json({ error: 'No Supabase URL' }, { status: 500 })

    const client = createClient(url, serviceKey)
    const id = '1e2e7ccf-29fa-4511-b0d3-93c8347ead33'

    const { data, error } = await client.from('companies').upsert({ id, name: 'Test Company For Join Flow' }, { onConflict: 'id' }).select('*').single()
    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })

    return NextResponse.json({ ok: true, company: data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function GET() { return NextResponse.json({ method: 'use POST' }) }
