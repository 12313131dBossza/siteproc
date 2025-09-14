import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({ 
      status: 'API is working',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    return NextResponse.json({ 
      status: 'POST endpoint working',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'POST test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}