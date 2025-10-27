import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { logActivity } from '@/app/api/activity/route';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = await sbServer();
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const lowStock = searchParams.get('lowStock');

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company_id and role from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    // Broadened filter: company OR null (shared products)
    if (profile?.company_id) {
      query = query.or(`company_id.eq.${profile.company_id},company_id.is.null`);
    } else {
      query = query.is('company_id', null);
    }

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('Products fetch error (RLS):', error);
      
      // Service-role fallback for admins/managers
      if (['admin', 'owner', 'manager'].includes(profile?.role || '')) {
        console.log('🔄 Using service-role fallback for products');
        
        const serviceSb = createServiceClient();
        let fallbackQuery = serviceSb
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (profile?.company_id) {
          fallbackQuery = fallbackQuery.or(`company_id.eq.${profile.company_id},company_id.is.null`);
        }

        if (status && status !== 'all') {
          fallbackQuery = fallbackQuery.eq('status', status);
        }

        if (category && category !== 'all') {
          fallbackQuery = fallbackQuery.eq('category', category);
        }

        const { data: fallbackProducts, error: fallbackError } = await fallbackQuery;
        
        if (fallbackError) {
          console.error('Service-role fallback also failed:', fallbackError);
          return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
        }

        // Apply low stock filter in JavaScript
        let filteredProducts = fallbackProducts || [];
        if (lowStock === 'true' && filteredProducts.length > 0) {
          filteredProducts = filteredProducts.filter((p: any) => 
            (p.stock_quantity || 0) <= (p.min_stock_level || 0)
          );
        }

        return NextResponse.json(filteredProducts);
      }
      
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

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

    console.log('📦 Product creation attempt - body:', JSON.stringify(body, null, 2));

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

    // Get user's company_id and role from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile fetch error:', profileError);
    }

    console.log('👤 Profile:', JSON.stringify(profile, null, 2));

    const productData = {
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
      company_id: profile?.company_id || null,
      created_by: user.id,
      created_at: new Date().toISOString()
    };

    console.log('📝 Product data to insert:', JSON.stringify(productData, null, 2));

    let product;
    let error;

    // Try with normal RLS first
    console.log('🔐 Attempting insert with RLS...');
    const result = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();

    product = result.data;
    error = result.error;

    if (error) {
      console.error('❌ RLS insert failed:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ RLS insert succeeded:', product?.id);
    }

    // Service-role fallback if RLS blocks
    if (error && ['admin', 'owner', 'manager'].includes(profile?.role || '')) {
      console.log('🔄 Using service-role fallback for product creation (role:', profile?.role, ')');
      
      const serviceSb = createServiceClient();
      const fallbackResult = await serviceSb
        .from('products')
        .insert(productData)
        .select()
        .single();
      
      product = fallbackResult.data;
      error = fallbackResult.error;

      if (error) {
        console.error('❌ Service-role fallback also failed:', JSON.stringify(error, null, 2));
      } else {
        console.log('✅ Service-role fallback succeeded:', product?.id);
      }
    }

    if (error) {
      console.error('❌ Final error creating product:', error);
      return NextResponse.json(
        { 
          error: error.message || 'Failed to create product',
          details: error.details || 'No details available',
          hint: error.hint || 'No hint available',
          code: error.code || 'No code'
        },
        { status: 500 }
      );
    }

    // Log activity
    await logActivity({
      type: 'product',
      action: 'created',
      title: `Product "${product.name}" created`,
      description: `Created new product: ${product.name} (${product.category})`,
      entity_type: 'product',
      entity_id: product.id,
      metadata: {
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        price: product.price,
        unit: product.unit,
        stock_quantity: product.stock_quantity,
        status: product.status,
        supplier_name: product.supplier_name,
      },
      amount: product.price,
      status: 'success',
      user_id: user.id,
      company_id: profile?.company_id,
    })

    console.log('✅ Product created successfully:', product?.id);
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('❌ Unexpected error creating product:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create product',
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
