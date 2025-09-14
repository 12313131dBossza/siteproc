import { NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await sbServer()
    
    console.log('=== CHECKING EXPENSES SCHEMA ===')

    // Get user first
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Try to get any existing expense to see the schema
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Schema check error:', error)
      return NextResponse.json({
        error: 'Could not check schema',
        details: error.message,
        hint: error.hint,
        code: error.code
      })
    }

    const schema = expenses && expenses.length > 0 ? Object.keys(expenses[0]) : []
    
    console.log('Available columns in expenses table:', schema)

    return NextResponse.json({
      availableColumns: schema,
      sampleRecord: expenses?.[0] || null,
      recordCount: expenses?.length || 0
    })

  } catch (error) {
    console.error('Schema check failed:', error)
    return NextResponse.json({
      error: 'Schema check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}