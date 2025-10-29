import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    // Get last 20 notifications from database
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error) {
      return NextResponse.json({ 
        error: 'Failed to fetch notifications', 
        details: error.message 
      }, { status: 500 })
    }

    // Get counts by type
    const { data: counts } = await supabase
      .from('notifications')
      .select('type')
    
    const typeCounts = counts?.reduce((acc: any, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({ 
      total: notifications?.length || 0,
      notifications,
      typeCounts,
      message: 'This shows all notifications in the database (bypassing RLS)'
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: 'Internal error', 
      details: error instanceof Error ? error.message : 'Unknown' 
    }, { status: 500 })
  }
}
