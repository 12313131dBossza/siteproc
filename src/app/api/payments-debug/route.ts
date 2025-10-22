import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'

/**
 * Debug endpoint for Payments - uses service-role to bypass RLS
 * GET /api/payments-debug - List last 20 payments
 */
export async function GET() {
  try {
    const supabase = createServiceClient()
    
    // Get last 20 payments
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        id,
        company_id,
        project_id,
        created_by,
        vendor_name,
        amount,
        payment_date,
        payment_method,
        status,
        approved_by,
        approved_at,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching payments (debug):', error)
      return NextResponse.json({
        ok: false,
        error: error.message,
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      count: payments.length,
      payments
    })
  } catch (error: any) {
    console.error('Unexpected error in payments-debug:', error)
    return NextResponse.json({
      ok: false,
      error: error.message
    }, { status: 500 })
  }
}
