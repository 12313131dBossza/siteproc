import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test creating a simple delivery
    const testDelivery = {
      order_id: `TEST-${Date.now()}`,
      delivery_date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
      status: 'pending',
      driver_name: 'Test Driver',
      vehicle_number: 'TEST-001',
      notes: 'Test delivery for debugging',
      items: [
        {
          product_name: 'Test Product',
          quantity: 5,
          unit: 'pieces',
          unit_price: 10.50
        }
      ]
    }

    const response = await fetch('http://localhost:3000/api/order-deliveries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testDelivery),
    })

    const result = await response.json()

    return NextResponse.json({
      success: true,
      test_status: response.ok ? 'PASS' : 'FAIL',
      status_code: response.status,
      api_response: result,
      test_data: testDelivery
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      test_status: 'ERROR'
    })
  }
}