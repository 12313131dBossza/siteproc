import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = await sbServer();
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const lowStock = searchParams.get('lowStock');

    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Note: lowStock filter requires comparing two columns, which Supabase doesn't support directly
    // We'll filter in JavaScript instead
    const { data: products, error } = await query;

    if (error) throw error;

    // Apply low stock filter in JavaScript
    let filteredProducts = products || [];
    if (lowStock === 'true' && filteredProducts.length > 0) {
      filteredProducts = filteredProducts.filter((p: any) => 
        (p.stock_quantity || 0) <= (p.min_stock_level || 0)
      );
    }

    return NextResponse.json(filteredProducts);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await sbServer();
    const body = await request.json();

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name: body.name,
        category: body.category,
        price: body.price,
        unit: body.unit || 'pcs',
        stock_quantity: body.stock_quantity || 0,
        min_stock_level: body.min_stock_level || 10,
        reorder_point: body.reorder_point || 15,
        reorder_quantity: body.reorder_quantity || 50,
        description: body.description,
        status: body.status || 'active',
        supplier_name: body.supplier_name,
        supplier_email: body.supplier_email,
        supplier_phone: body.supplier_phone,
        lead_time_days: body.lead_time_days || 7,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}
