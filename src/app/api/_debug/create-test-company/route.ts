import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    // Use hardcoded service key
    const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI"
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!url) {
      return NextResponse.json({ error: 'No Supabase URL' })
    }

    const client = createClient(url, serviceKey)
    
    // Create the test company
    const testCompanyId = '1e2e7ccf-29fa-4511-b0d3-93c8347ead33'
    const { data: company, error: companyError } = await client
      .from('companies')
      .upsert({ 
        id: testCompanyId, 
        name: 'Test Company for Joining' 
      }, { 
        onConflict: 'id' 
      })
      .select('*')
      .single()

    if (companyError) {
      return NextResponse.json({ 
        error: 'Failed to create company',
        details: companyError.message,
        code: companyError.code
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      company: company,
      message: 'Test company created successfully'
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Exception',
      message: error.message 
    }, { status: 500 })
  }
}
