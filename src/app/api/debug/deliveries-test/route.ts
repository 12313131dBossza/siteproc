import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simple test to see if we can reach the endpoint
    console.log('=== DELIVERIES DEBUG TEST ===')
    
    const testResponse = {
      message: 'Deliveries debug endpoint working',
      timestamp: new Date().toISOString(),
      routes: {
        'GET /api/order-deliveries': 'Fetch deliveries',
        'POST /api/order-deliveries': 'Create delivery',
        '/deliveries': 'Main deliveries page',
        '/deliveries/new': 'New delivery form'
      }
    }
    
    return NextResponse.json(testResponse)
  } catch (error) {
    return NextResponse.json({
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}