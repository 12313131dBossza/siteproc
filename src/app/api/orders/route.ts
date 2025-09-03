import { sbServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await sbServer();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { product_id, qty, notes } = body;

    // Validate required fields
    if (!product_id || !qty || qty <= 0) {
      return NextResponse.json(
        { error: 'Missing required fields: product_id and qty > 0' },
        { status: 400 }
      );
    }

    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, stock')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if requested quantity is available
    if (qty > product.stock) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${product.stock}` },
        { status: 400 }
      );
    }

    // Create the order
    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert([{
        product_id,
        qty: parseFloat(qty),
        notes: notes || null,
        created_by: user.id,
        status: 'pending'
      }])
      .select(`
        *,
        product:products(id, name, sku, price, unit),
        created_by_profile:profiles!created_by(id, full_name, email)
      `)
      .single();

    if (insertError) {
      console.error('Order creation error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    return NextResponse.json(order, { status: 201 });

  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Build query - admins see all orders, users see only their own
    let query = supabase
      .from('orders')
      .select(`
        *,
        product:products(id, name, sku, price, unit),
        created_by_profile:profiles!created_by(id, full_name, email),
        decided_by_profile:profiles!decided_by(id, full_name, email)
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
