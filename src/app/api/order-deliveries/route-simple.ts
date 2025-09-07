import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    console.log('Order deliveries API called')
    
    // Simple test without authentication first
    const sb = supabaseService()
    
    // Just return empty data for now to test if API works
    return NextResponse.json({
      deliveries: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
      },
    })

  } catch (error) {
    console.error('Order deliveries API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
