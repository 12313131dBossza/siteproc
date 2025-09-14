import { NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await sbServer()
    
    console.log('=== CHECKING DELIVERIES SCHEMA ===')

    // Get user first
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Try to get any existing delivery to see the schema
    const { data: deliveries, error } = await supabase
      .from('deliveries')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Deliveries schema check error:', error)
      return NextResponse.json({
        error: 'Could not check deliveries schema',
        details: error.message,
        hint: error.hint,
        code: error.code
      })
    }

    const schema = deliveries && deliveries.length > 0 ? Object.keys(deliveries[0]) : []
    
    console.log('Available columns in deliveries table:', schema)

    // Also check if the table exists by trying a count
    const { count, error: countError } = await supabase
      .from('deliveries')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      tableExists: !countError,
      availableColumns: schema,
      sampleRecord: deliveries?.[0] || null,
      recordCount: deliveries?.length || 0,
      totalCount: count || 0,
      schemaError: error?.message,
      countError: countError?.message
    })

  } catch (error) {
    console.error('Deliveries schema check failed:', error)
    return NextResponse.json({
      error: 'Schema check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}