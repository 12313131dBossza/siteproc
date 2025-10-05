import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { syncOrderStatus } from '@/lib/orderSync'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
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
