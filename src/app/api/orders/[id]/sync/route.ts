import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'
import { syncOrderStatus } from '@/lib/orderSync'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Sync order status
    const result = await syncOrderStatus(supabase, params.id)

    return NextResponse.json({
      success: true,
      ...result,
      message: `Order status synced: ${result.status}`
    })
  } catch (error: any) {
    console.error('Error syncing order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync order status' },
      { status: 500 }
    )
  }
}
