import { sbServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await sbServer();
    
    // Test 1: Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Test 2: Check products table access
    let productsResult = null;
    let productsError = null;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock')
        .limit(1);
      productsResult = data;
      productsError = error;
    } catch (e) {
      productsError = e;
    }
    
    // Test 3: Check orders table access
    let ordersResult = null;
    let ordersError = null;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id')
        .limit(1);
      ordersResult = data;
      ordersError = error;
    } catch (e) {
      ordersError = e;
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      auth: {
        user: user ? { id: user.id, email: user.email } : null,
        error: authError?.message || null
      },
      products: {
        data: productsResult,
        error: productsError?.message || null
      },
      orders: {
        data: ordersResult,
        error: ordersError?.message || null
      },
      environment: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      error: 'Debug API failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
