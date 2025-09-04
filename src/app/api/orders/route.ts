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

    // Create the order - try different column combinations
    console.log('Orders POST: Creating order');
    
    // Try all possible combinations of column names
    const columnVariations = [
      { userCol: 'user_id', noteCol: 'note' },      // Toko schema
      { userCol: 'user_id', noteCol: 'notes' },     // Alternative
      { userCol: 'created_by', noteCol: 'note' },   // New schema
      { userCol: 'created_by', noteCol: 'notes' }   // Alternative new
    ];

    let order = null;
    let insertError = null;

    for (const { userCol, noteCol } of columnVariations) {
      const orderData = {
        product_id,
        qty: parseFloat(qty),
        [noteCol]: notes || null,
        [userCol]: user.id,
        status: 'pending'
      };
      
      console.log(`Orders POST: Trying ${userCol}/${noteCol} combination:`, orderData);

      const result = await supabase
        .from('orders')
        .insert([orderData])
        .select(`
          *,
          product:products(id, name, sku, price, unit)
        `)
        .single();

      if (!result.error) {
        order = result.data;
        insertError = null;
        console.log(`Orders POST: Success with ${userCol}/${noteCol}`);
        break;
      } else {
        insertError = result.error;
        console.log(`Orders POST: Failed with ${userCol}/${noteCol}:`, result.error.message);
      }
    }

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
    console.log('Orders GET: Starting request processing');
    const supabase = await sbServer();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Orders GET: Auth check result:', { user: user?.id, authError: authError?.message });
    
    if (authError || !user) {
      console.log('Orders GET: Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role (with fallback)
    console.log('Orders GET: Checking user profile');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('Orders GET: Profile check result:', { profile, profileError: profileError?.message });

    // If no profiles table or error, assume user can see all orders for now
    const isAdmin = profile?.role === 'admin' || profile?.role === 'owner' || !profile || profileError;
    console.log('Orders GET: User is admin:', isAdmin);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    console.log('Orders GET: Query parameters:', { status, search });

    // Try different query approaches based on schema
    let orders = null;
    let queryError = null;

    // First attempt: Try with created_by column
    console.log('Orders GET: Trying with created_by column');
    let query = supabase
      .from('orders')
      .select(`
        *,
        product:products(id, name, sku, price, unit)
      `)
      .order('created_at', { ascending: false });

    // Apply user filtering if not admin
    if (!isAdmin) {
      query = query.eq('created_by', user.id);
    }

    // Apply status filter
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }

    const result1 = await query;
    
    if (!result1.error) {
      orders = result1.data;
      console.log('Orders GET: Success with created_by column, found:', orders?.length || 0);
    } else {
      console.log('Orders GET: Failed with created_by:', result1.error.message);
      queryError = result1.error;

      // Second attempt: Try with user_id column
      console.log('Orders GET: Trying with user_id column');
      let query2 = supabase
        .from('orders')
        .select(`
          *,
          product:products(id, name, sku, price, unit)
        `)
        .order('created_at', { ascending: false });

      // Apply user filtering if not admin
      if (!isAdmin) {
        query2 = query2.eq('user_id', user.id);
      }

      // Apply status filter
      if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        query2 = query2.eq('status', status);
      }

      const result2 = await query2;
      
      if (!result2.error) {
        orders = result2.data;
        console.log('Orders GET: Success with user_id column, found:', orders?.length || 0);
      } else {
        console.log('Orders GET: Failed with user_id:', result2.error.message);
        queryError = result2.error;
      }
    }

    if (!orders && queryError) {
      console.error('Orders GET: All query attempts failed:', queryError);
      return NextResponse.json(
        { error: `Failed to fetch orders: ${queryError.message}` },
        { status: 500 }
      );
    }

    // Apply search filter in JavaScript if needed
    let filteredOrders = orders || [];
    if (search && filteredOrders.length > 0) {
      console.log('Orders GET: Applying search filter:', search);
      filteredOrders = filteredOrders.filter(order => 
        order.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
        order.notes?.toLowerCase().includes(search.toLowerCase()) ||
        order.note?.toLowerCase().includes(search.toLowerCase())
      );
      console.log('Orders GET: After search filter:', filteredOrders.length);
    }

    console.log('Orders GET: Success, returning', filteredOrders.length, 'orders');
    return NextResponse.json(filteredOrders);

  } catch (error) {
    console.error('Orders GET API error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
