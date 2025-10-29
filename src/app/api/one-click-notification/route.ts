import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'
import { getCurrentUserProfile } from '@/lib/server-utils'

// One-click notification creator - gets user automatically
export async function POST(request: NextRequest) {
  try {
    // Get current user
    const { profile, error: profileError } = await getCurrentUserProfile()
    
    if (profileError || !profile) {
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated' 
      }, { status: 401 })
    }

    console.log('🎯 One-click notification for user:', profile.id)

    // Use service client to bypass RLS
    const supabase = createServiceClient()

    // Create notification
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: profile.id,
        company_id: profile.company_id,
        type: 'system',
        title: '🎉 One-Click Test Notification',
        message: `This notification was created at ${new Date().toLocaleString()}. If you can see this, the notification system is working!`,
        link: '/dashboard',
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    console.log('✅ Notification created:', data.id)

    return NextResponse.json({ 
      success: true, 
      notification: data,
      message: 'Notification created! Check the bell icon in navbar.'
    })

  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
