// Test Email Notifications
// Run this in your browser console on the live app after login

async function testEmailNotifications() {
  console.log('🧪 Testing Email Notifications...');
  
  try {
    // Test 1: Create an expense (should trigger notification to admins)
    console.log('\n1️⃣ Testing expense creation notification...');
    const expenseResponse = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendor: 'Email Test Vendor',
        category: 'materials',
        amount: 99.99,
        notes: 'Test expense for email notification'
      })
    });
    
    const expenseResult = await expenseResponse.json();
    if (expenseResponse.ok) {
      console.log('✅ Expense created:', expenseResult.id);
      console.log('   Status:', expenseResult.status);
      console.log('   → Admin notification should be sent');
      
      // If user is admin, expense will be auto-approved
      // If user is member, it will be pending and admin will get notification
      
    } else {
      console.log('❌ Expense creation failed:', expenseResult.error);
    }

    // Test 2: If user is admin, test approval workflow
    const userRole = await getCurrentUserRole();
    if (['admin', 'owner', 'bookkeeper'].includes(userRole)) {
      console.log('\n2️⃣ Testing expense approval notification (as admin)...');
      
      // Find a pending expense to approve
      const pendingResponse = await fetch('/api/expenses?status=pending');
      const pendingData = await pendingResponse.json();
      
      if (pendingData.expenses && pendingData.expenses.length > 0) {
        const pendingExpense = pendingData.expenses[0];
        console.log('Found pending expense to test:', pendingExpense.id);
        
        const approveResponse = await fetch(`/api/expenses/${pendingExpense.id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'approve',
            notes: 'Approved for email notification testing'
          })
        });
        
        const approveResult = await approveResponse.json();
        if (approveResponse.ok) {
          console.log('✅ Expense approved');
          console.log('   → Notification should be sent to expense creator');
        } else {
          console.log('❌ Approval failed:', approveResult.error);
        }
      } else {
        console.log('ℹ️ No pending expenses found to test approval notification');
      }
    } else {
      console.log('\n2️⃣ Skipping approval test (not admin role)');
    }

    // Test 3: Create an order (should trigger notification to admins)
    console.log('\n3️⃣ Testing order creation notification...');
    
    // First get available products
    const productsResponse = await fetch('/api/products');
    const productsData = await productsResponse.json();
    
    if (productsData && productsData.length > 0) {
      const testProduct = productsData[0];
      console.log('Using test product:', testProduct.name);
      
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: testProduct.id,
          qty: 1,
          notes: 'Test order for email notification'
        })
      });
      
      const orderResult = await orderResponse.json();
      if (orderResponse.ok) {
        console.log('✅ Order created:', orderResult.id);
        console.log('   → Admin notification should be sent');
        
        // Test order approval if user is admin
        if (['admin', 'owner', 'bookkeeper'].includes(userRole)) {
          console.log('\n4️⃣ Testing order approval notification...');
          
          const decisionResponse = await fetch(`/api/orders/${orderResult.id}/decision`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'approve',
              po_number: 'TEST-PO-001'
            })
          });
          
          const decisionResult = await decisionResponse.json();
          if (decisionResponse.ok) {
            console.log('✅ Order approved');
            console.log('   → Notification should be sent to order creator');
          } else {
            console.log('❌ Order approval failed:', decisionResult.error);
          }
        }
        
      } else {
        console.log('❌ Order creation failed:', orderResult.error);
      }
    } else {
      console.log('❌ No products available for order test');
    }

    console.log('\n✅ Email notification tests completed!');
    console.log('📧 Check admin and user email inboxes for notifications');
    console.log('📊 Check browser network tab and server logs for email sending status');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function getCurrentUserRole() {
  try {
    const response = await fetch('/api/expenses');
    const data = await response.json();
    return data.userRole || 'viewer';
  } catch {
    return 'viewer';
  }
}

// Export for manual use
window.testEmailNotifications = testEmailNotifications;

console.log('📧 Email notification tester loaded!');
console.log('🔬 Run: testEmailNotifications()');
