import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const sb = supabaseService()

    // Check what tables exist
    const { data: tables, error: tablesError } = await (sb as any)
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')

    if (tablesError) {
      console.error('Tables fetch error:', tablesError)
    }

    // Try to check the deliveries table structure
    let deliveriesStructure = null
    try {
      const { data: deliveriesCheck, error: deliveriesError } = await (sb as any)
        .from('deliveries')
        .select('*')
        .limit(1)

      if (!deliveriesError) {
        deliveriesStructure = deliveriesCheck
      } else {
        deliveriesStructure = { error: deliveriesError.message }
      }
    } catch (e) {
      deliveriesStructure = { error: 'Table might not exist' }
    }

    // Try to check the orders table structure
    let ordersStructure = null
    try {
      const { data: ordersCheck, error: ordersError } = await (sb as any)
        .from('orders')
        .select('*')
        .limit(1)

      if (!ordersError) {
        ordersStructure = ordersCheck
      } else {
        ordersStructure = { error: ordersError.message }
      }
    } catch (e) {
      ordersStructure = { error: 'Table might not exist' }
    }

    return NextResponse.json({
      tables: tables?.map(t => t.table_name) || [],
      deliveriesStructure,
      ordersStructure,
      tablesError: tablesError?.message || null
    })

  } catch (error) {
    console.error('Database check error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'debug'
    }, { status: 500 })
  }
}
