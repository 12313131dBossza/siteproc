import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'

// Simple endpoint to create a notification - no complex logic
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, companyId, type, title, message, link } = body

    console.log('📝 Creating notification:', { userId, companyId, type, title })

    // Use service client to bypass RLS
    const supabase = createServiceClient()

    // Direct insert into notifications table
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        company_id: companyId,
        type: type || 'system',
        title: title,
        message: message,
        link: link || null,
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error 
      }, { status: 500 })
    }

    console.log('✅ Notification created:', data.id)

    return NextResponse.json({ 
      success: true, 
      notification: data,
      message: 'Notification created successfully'
    })

  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
