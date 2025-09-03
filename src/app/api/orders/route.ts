import { sbServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Orders POST: Starting request processing');
    
    const supabase = await sbServer();
    console.log('Orders POST: Supabase client created');
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Orders POST: Auth check result:', { user: user?.id, authError: authError?.message });
    
    if (authError || !user) {
      console.log('Orders POST: Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    console.log('Orders POST: Request body:', body);
    
    const { product_id, qty, notes } = body;

    // Validate required fields
    if (!product_id || !qty || qty <= 0) {
      console.log('Orders POST: Validation failed');
      return NextResponse.json(
        { error: 'Missing required fields: product_id and qty > 0' },
        { status: 400 }
      );
    }

    // Verify product exists
    console.log('Orders POST: Checking product exists:', product_id);
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, stock')
      .eq('id', product_id)
      .single();

    console.log('Orders POST: Product check result:', { product, productError: productError?.message });

    if (productError || !product) {
      console.log('Orders POST: Product not found');
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if requested quantity is available
    if (qty > product.stock) {
      console.log('Orders POST: Insufficient stock');
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${product.stock}` },
        { status: 400 }
      );
    }

    // Create the order (simplified - no profiles dependency)
    console.log('Orders POST: Creating order');
    const orderData = {
      product_id,
      qty: parseFloat(qty),
      notes: notes || null,
      created_by: user.id,
      status: 'pending'
    };
    console.log('Orders POST: Order data:', orderData);

    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert([orderData])
      .select(`
        *,
        product:products(id, name, sku, price, unit)
      `)
      .single();

    console.log('Orders POST: Insert result:', { order, insertError: insertError?.message });

    if (insertError) {
      console.error('Order creation error:', insertError);
      return NextResponse.json(
        { error: `Failed to create order: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log('Orders POST: Success');
    return NextResponse.json(order, { status: 201 });

  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await sbServer();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role (with fallback)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // If no profiles table, assume user can see all orders for now
    const isAdmin = profile?.role === 'admin' || profile?.role === 'owner' || !profile;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Build query - simplified without profiles join
    let query = supabase
      .from('orders')
      .select(`
        *,
        product:products(id, name, sku, price, unit)
      `)
      .order('created_at', { ascending: false });

    // Apply RLS - users only see their orders, admins see all
    if (!isAdmin) {
      query = query.eq('created_by', user.id);
    }

    // Apply filters
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }

    if (search) {
      // Search by product name (join filter)
      query = query.ilike('product.name', `%${search}%`);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Orders fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    return NextResponse.json(orders || []);

  } catch (error) {
    console.error('Orders GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
