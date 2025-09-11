import { NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const projectId = params.id
    console.log('Create test order: Starting for project:', projectId)
    
    // Use service role to bypass RLS for creating test data
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(serviceUrl, serviceKey)
    
    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, company_id')
      .eq('id', projectId)
      .single()
    
    if (projectError || !project) {
      console.error('Create test order: Project not found:', projectError)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    console.log('Create test order: Found project:', project.name)
    
    // Ensure a product exists with stock
    let { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, name, stock')
      .gt('stock', 0)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (productError) {
      console.error('Create test order: Product query error:', productError)
      return NextResponse.json({ error: 'Failed to find product' }, { status: 500 })
    }
    
    // Create a product if none exists
    if (!productData) {
      console.log('Create test order: Creating mock product')
      const { data: newProduct, error: createProductError } = await supabase
        .from('products')
        .insert([{
          id: crypto.randomUUID(),
          name: 'MOCK TEST PRODUCT',
          sku: 'MOCK-SKU-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
          price: 12.34,
          stock: 100,
          unit: 'unit'
        }])
        .select('id, name, stock')
        .single()
      
      if (createProductError) {
        console.error('Create test order: Failed to create product:', createProductError)
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
      }
      
      productData = newProduct
    }
    
    console.log('Create test order: Using product:', productData.name)
    
    // Get an admin/owner user for the order
    const { data: adminUser, error: adminError } = await supabase
      .from('profiles')
      .select('id, company_id')
      .in('role', ['admin', 'owner'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (adminError || !adminUser) {
      console.error('Create test order: No admin user found:', adminError)
      return NextResponse.json({ error: 'No admin user found' }, { status: 500 })
    }
    
    // Try different column combinations for orders table
    const orderVariations = [
      { userCol: 'created_by', noteCol: 'note' },
      { userCol: 'created_by', noteCol: 'notes' },
      { userCol: 'user_id', noteCol: 'note' },
      { userCol: 'user_id', noteCol: 'notes' },
    ]
    
    let createdOrder = null
    let lastError = null
    
    for (const variation of orderVariations) {
      const orderData: any = {
        id: crypto.randomUUID(),
        product_id: productData.id,
        qty: 1,
        status: 'pending',
        project_id: projectId,
        [variation.userCol]: adminUser.id,
        [variation.noteCol]: `TEST ORDER for ${project.name}`,
      }
      
      // Add company_id if available
      if (project.company_id) {
        orderData.company_id = project.company_id
      }
      
      console.log(`Create test order: Trying ${variation.userCol}/${variation.noteCol}`)
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select('*')
        .single()
      
      if (!orderError) {
        createdOrder = order
        console.log('Create test order: Success with:', variation.userCol, variation.noteCol)
        break
      } else {
        console.log(`Create test order: Failed with ${variation.userCol}/${variation.noteCol}:`, orderError.message)
        lastError = orderError
        
        // If company_id column doesn't exist, retry without it
        if (orderError.message?.toLowerCase().includes('company_id') && project.company_id) {
          delete orderData.company_id
          const { data: retryOrder, error: retryError } = await supabase
            .from('orders')
            .insert([orderData])
            .select('*')
            .single()
          
          if (!retryError) {
            createdOrder = retryOrder
            console.log('Create test order: Success on retry without company_id')
            break
          } else {
            lastError = retryError
          }
        }
      }
    }
    
    // Final fallback: minimal insert
    if (!createdOrder && lastError) {
      console.log('Create test order: Trying minimal fallback')
      const { data: fallbackOrder, error: fallbackError } = await supabase
        .from('orders')
        .insert([{
          id: crypto.randomUUID(),
          product_id: productData.id,
          qty: 1,
          status: 'pending',
          project_id: projectId
        }])
        .select('*')
        .single()
      
      if (!fallbackError) {
        createdOrder = fallbackOrder
        console.log('Create test order: Success with minimal fallback')
      } else {
        console.error('Create test order: All attempts failed. Last error:', fallbackError)
        return NextResponse.json({ 
          error: `Failed to create test order: ${fallbackError.message}` 
        }, { status: 500 })
      }
    }
    
    if (!createdOrder) {
      console.error('Create test order: All attempts failed. Last error:', lastError)
      return NextResponse.json({ 
        error: `Failed to create test order: ${lastError?.message}` 
      }, { status: 500 })
    }
    
    console.log('Create test order: Created successfully:', createdOrder.id)
    
    return NextResponse.json({ 
      success: true, 
      order: createdOrder,
      message: `Test order created successfully for ${project.name}`
    })
    
  } catch (error) {
    console.error('Create test order: Unexpected error:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
