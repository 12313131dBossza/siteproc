import { NextRequest, NextResponse } from 'next/server'
import { notifyOrderApproval } from '@/lib/notification-triggers'

// Test endpoint to manually trigger an order approval notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderCreatorId, companyId, orderId, orderNumber, projectName } = body

    console.log('🧪 Testing order approval notification with:', {
      orderCreatorId,
      companyId,
      orderId,
      orderNumber,
      projectName
    })

    await notifyOrderApproval({
      orderId: orderId || 'test-order-123',
      orderCreatorId: orderCreatorId,
      companyId: companyId,
      orderNumber: orderNumber || 'TEST-001',
      projectName: projectName || 'Test Project',
      approverName: 'Test Admin'
    })

    console.log('✅ Test notification sent successfully')

    return NextResponse.json({ 
      success: true, 
      message: 'Test notification sent',
      details: { orderCreatorId, companyId }
    })
  } catch (error) {
    console.error('❌ Test notification failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
