import { NextRequest, NextResponse } from 'next/server'
import {
  sendOrderRequestNotification,
  sendExpenseSubmissionNotification,
  sendDeliveryConfirmationNotification,
  sendBudgetVarianceAlert,
  isEmailEnabled
} from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { to, type } = await request.json()

    if (!to || !type) {
      return NextResponse.json(
        { error: 'Email address and type are required' },
        { status: 400 }
      )
    }

    if (!isEmailEnabled()) {
      return NextResponse.json(
        { error: 'Email service is not configured' },
        { status: 500 }
      )
    }

    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`

    let result
    
    switch (type) {
      case 'order-request':
        result = await sendOrderRequestNotification({
          orderId: 'TEST-ORDER-123',
          projectName: 'Downtown Office Renovation',
          companyName: 'ABC Construction',
          requestedBy: 'John Doe',
          requestedByEmail: 'john.doe@example.com',
          amount: 2500.00,
          description: '50 bags of cement, 100 bricks, steel reinforcement bars',
          category: 'Materials',
          approverName: to,
          dashboardUrl
        })
        break

      case 'expense-submission':
        result = await sendExpenseSubmissionNotification({
          expenseId: 'TEST-EXPENSE-456',
          projectName: 'Downtown Office Renovation',
          companyName: 'ABC Construction',
          submittedBy: 'Jane Smith',
          submittedByEmail: 'jane.smith@example.com',
          amount: 450.00,
          description: 'Fuel for equipment transport',
          category: 'Transportation',
          adminName: to,
          dashboardUrl,
          receiptUrl: `${dashboardUrl}/receipts/test`
        })
        break

      case 'delivery-confirmation':
        result = await sendDeliveryConfirmationNotification({
          deliveryId: 'TEST-DELIVERY-789',
          projectName: 'Downtown Office Renovation',
          companyName: 'ABC Construction',
          orderId: 'TEST-ORDER-123',
          orderDescription: 'Cement and bricks delivery',
          deliveredBy: 'Mike Johnson',
          deliveredByEmail: 'mike.johnson@example.com',
          adminName: to,
          dashboardUrl,
          photoUrls: [
            `${dashboardUrl}/photos/delivery-1`,
            `${dashboardUrl}/photos/delivery-2`
          ]
        })
        break

      case 'budget-alert':
        result = await sendBudgetVarianceAlert({
          projectId: 'TEST-PROJECT-001',
          projectName: 'Downtown Office Renovation',
          companyName: 'ABC Construction',
          currentSpent: 85000,
          budget: 100000,
          percentageUsed: 85,
          adminEmails: [to],
          dashboardUrl
        })
        break

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 }
        )
    }

    if (result.ok === false) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: `${type} email sent successfully`,
      result 
    })
  } catch (error: any) {
    console.error('[test-email-templates] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}
