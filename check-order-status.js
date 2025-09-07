const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrderStatus() {
  try {
    // Get existing orders to see what status values are used
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('id, status, note, qty, created_at')
      .limit(10);
      
    console.log('Existing orders:', existingOrders?.map(o => ({ status: o.status, note: o.note, qty: o.qty })));
    
    // Try to create with 'pending' status instead
    const { data: newOrder, error } = await supabase
      .from('orders')
      .insert({
        product_id: '9a8e4999-d776-4ab0-8026-36d03938f9dc', // Use existing product ID
        user_id: '35a57302-cfec-48ef-b964-b28448ee68c4', // Use existing user ID
        qty: 25,
        note: 'Test delivery - 25 units delivered',
        status: 'pending'
      })
      .select()
      .single();
      
    if (error) {
      console.log('Order creation error:', error.message);
    } else {
      console.log('✅ Test order created:', newOrder);
      
      // Now try to update it to see what status values work
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'approved',
          decided_by: '35a57302-cfec-48ef-b964-b28448ee68c4',
          decided_at: new Date().toISOString()
        })
        .eq('id', newOrder.id)
        .select()
        .single();
        
      if (updateError) {
        console.log('Update error:', updateError.message);
      } else {
        console.log('✅ Order updated to approved:', updatedOrder.status);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkOrderStatus();
