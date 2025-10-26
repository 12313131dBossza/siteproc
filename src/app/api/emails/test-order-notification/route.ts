import { NextRequest, NextResponse } from 'next/server'
import { sendOrderRequestNotification } from '@/lib/email'

/**
 * POST /api/emails/test-order-notification
 * 
 * Test endpoint to send a sample order notification email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    // Send test order notification
    const result = await sendOrderRequestNotification({
      orderId: 'TEST-001',
      projectName: 'Downtown Office Building',
      companyName: 'ABC Construction',
      requestedBy: 'John Doe',
      requestedByEmail: email,
      amount: 2500.00,
      description: 'Concrete delivery for foundation work',
      category: 'Materials',
      approverName: email, // Send to the same email for testing
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders/TEST-001`,
    })

    if (result.skipped) {
      return NextResponse.json({
        success: true,
        message: 'Email sending is disabled or logged only',
        details: result,
      })
    }

    if (result.ok === false) {
      return NextResponse.json(
        { error: 'Failed to send email', details: result },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Test order notification sent successfully!',
      sentTo: email,
    })
  } catch (error: any) {
    console.error('[API] Test email error:', error)
    return NextResponse.json(
      { error: 'Failed to send test email', message: error.message },
      { status: 500 }
    )
  }
}
