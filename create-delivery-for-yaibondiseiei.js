// Check which company yaibondiseiei@gmail.com belongs to and create test delivery
const { createClient } = require('@supabase/supabase-js')

async function checkUserAndCreateDelivery() {
  const supabase = createClient(
    'https://vrkgtygzcokqoeeutvxd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  console.log('=== CHECKING yaibondiseiei@gmail.com USER ===')
  
  // First, find the user ID for yaibondiseiei@gmail.com
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
  
  if (usersError) {
    console.error('Error fetching users:', usersError)
    return
  }

  const targetUser = users.find(user => user.email === 'yaibondiseiei@gmail.com')
  
  if (!targetUser) {
    console.log('❌ User yaibondiseiei@gmail.com not found')
    return
  }

  console.log('✅ Found user:', targetUser.id, targetUser.email)

  // Get user's profile to find their company
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, company_id, role')
    .eq('id', targetUser.id)
    .single()

  if (profileError) {
    console.error('Profile error:', profileError)
    return
  }

  console.log('User profile:')
  console.table([profile])

  // Get the company name
  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', profile.company_id)
    .single()

  console.log(`User belongs to company: ${company?.name} (${company?.id})`)

  // Check existing deliveries for this company
  const { data: existingDeliveries } = await supabase
    .from('deliveries')
    .select(`
      id,
      order_id,
      total_amount,
      status,
      delivery_items(id, product_name, quantity, total_price)
    `)
    .eq('company_id', profile.company_id)

  console.log(`\nExisting deliveries for ${company?.name}:`)
  if (!existingDeliveries || existingDeliveries.length === 0) {
    console.log('❌ No deliveries found for this company')
  } else {
    existingDeliveries.forEach((delivery, index) => {
      const itemCount = delivery.delivery_items?.length || 0
      console.log(`  ${index + 1}. ${delivery.order_id}: ${itemCount} items (₹${delivery.total_amount})`)
    })
  }

  // Create a test delivery with items for this user's company
  console.log(`\n=== CREATING TEST DELIVERY FOR ${company?.name} ===`)
  
  const deliveryData = {
    order_id: `ORD-${targetUser.email.split('@')[0].toUpperCase()}-${Date.now()}`,
    delivery_date: new Date().toISOString(),
    status: 'pending',
    driver_name: 'Test Driver',
    vehicle_number: 'TEST-456',
    notes: `Test delivery for ${targetUser.email}`,
    total_amount: 75.50,
    company_id: profile.company_id,
    created_by: targetUser.id
  }

  const { data: delivery, error: deliveryError } = await supabase
    .from('deliveries')
    .insert(deliveryData)
    .select()
    .single()

  if (deliveryError) {
    console.error('Delivery creation error:', deliveryError)
    return
  }

  console.log('✅ Delivery created:', delivery.order_id)

  // Create delivery items
  const items = [
    {
      delivery_id: delivery.id,
      product_name: 'Bricks',
      quantity: 100,
      unit: 'pieces',
      unit_price: 0.50,
      total_price: 50.00
    },
    {
      delivery_id: delivery.id,
      product_name: 'Sand',
      quantity: 1.5,
      unit: 'tons',
      unit_price: 17.00,
      total_price: 25.50
    }
  ]

  const { data: createdItems, error: itemsError } = await supabase
    .from('delivery_items')
    .insert(items)
    .select()

  if (itemsError) {
    console.error('Items creation error:', itemsError)
    return
  }

  console.log('✅ Items created:', createdItems.length)
  
  console.log('\n🎉 SUCCESS!')
  console.log(`Created delivery ${delivery.order_id} with 2 items for ${targetUser.email}`)
  console.log('Items:')
  console.log('  - Bricks: 100 pieces @ ₹0.50 = ₹50.00')
  console.log('  - Sand: 1.5 tons @ ₹17.00 = ₹25.50')
  console.log('  Total: ₹75.50')
  console.log('\nRefresh your browser to see the delivery with "2 items" instead of "0 items"!')
}

checkUserAndCreateDelivery().catch(console.error)
