import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI"
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!url) {
      return NextResponse.json({ error: 'No Supabase URL' }, { status: 500 })
    }

    const client = createClient(url, serviceKey)

    const { data: companies, error: compErr } = await client.from('companies').select('id,name').limit(10)
  // Omit email column (not present in production DB currently)
  const { data: profiles, error: profErr } = await client.from('profiles').select('id,company_id,role').limit(5)

    return NextResponse.json({
      ok: true,
      companiesCount: companies?.length || 0,
      companies,
      profilesSample: profiles,
      errors: {
        companies: compErr?.message,
        profiles: profErr?.message
      },
      env: {
        hasUrl: !!url,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        urlPrefix: url.substring(0, 25) + '...'
      },
      ts: new Date().toISOString()
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
