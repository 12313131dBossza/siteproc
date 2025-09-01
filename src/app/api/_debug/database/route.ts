import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Use hardcoded service key
    const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI"
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!url) {
      return NextResponse.json({ error: 'No Supabase URL' })
    }

    const client = createClient(url, serviceKey)
    
    // Check if test company exists
    const testCompanyId = '1e2e7ccf-29fa-4511-b0d3-93c8347ead33'
    const { data: company, error: companyError } = await client
      .from('companies')
      .select('*')
      .eq('id', testCompanyId)
      .single()
    
    // Get all companies
    const { data: allCompanies, error: allError } = await client
      .from('companies')
      .select('id, name')
      .limit(10)
    
    // Get profiles table structure
    const { data: profiles, error: profilesError } = await client
      .from('profiles')
      .select('*')
      .limit(3)

    return NextResponse.json({
      testCompany: {
        exists: !companyError && !!company,
        data: company,
        error: companyError?.message
      },
      allCompanies: {
        count: allCompanies?.length || 0,
        data: allCompanies,
        error: allError?.message
      },
      profiles: {
        count: profiles?.length || 0,
        sample: profiles,
        error: profilesError?.message
      },
      supabaseUrl: url?.substring(0, 30) + '...'
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Exception',
      message: error.message 
    }, { status: 500 })
  }
}
