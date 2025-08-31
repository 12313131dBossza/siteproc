import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('Environment check:', {
      hasUrl: !!url,
      hasServiceKey: !!serviceKey,
      nodeEnv: process.env.NODE_ENV,
      urlLength: url?.length,
      serviceKeyLength: serviceKey?.length
    })

    if (!url || !serviceKey) {
      return NextResponse.json({ 
        error: 'Missing environment variables',
        hasUrl: !!url,
        hasServiceKey: !!serviceKey,
        urlPrefix: url?.substring(0, 30),
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
      })
    }

    // Test creating client
    const client = createClient(url, serviceKey)
    
    // Test a simple query
    const { data, error } = await client.from('companies').select('id').limit(1)
    
    return NextResponse.json({
      success: true,
      hasUrl: !!url,
      hasServiceKey: !!serviceKey,
      clientCreated: !!client,
      testQuerySuccess: !error,
      testError: error?.message,
      companiesCount: data?.length || 0
    })
  } catch (e: any) {
    return NextResponse.json({ 
      error: 'Exception occurred',
      message: e.message,
      stack: e.stack?.split('\n').slice(0, 5)
    }, { status: 500 })
  }
}
