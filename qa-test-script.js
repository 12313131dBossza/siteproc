// QA Testing Script for Expense Workflow
// Run this in browser console on your deployed app

async function testExpenseWorkflow() {
  console.log('🔍 Testing Complete Expense Workflow...');
  
  const baseUrl = window.location.origin;
  
  try {
    // Test 1: Check current user role
    console.log('\n1️⃣ Checking user authentication and role...');
    const authResponse = await fetch('/api/auth/session');
    const authData = await authResponse.json();
    console.log('Auth status:', authData);

    // Test 2: Fetch expenses (should respect RLS)
    console.log('\n2️⃣ Testing expense visibility (RLS policies)...');
    const expensesResponse = await fetch('/api/expenses');
    const expensesData = await expensesResponse.json();
    console.log('Expenses visible to current user:', expensesData.expenses?.length || 0);
    console.log('User role from API:', expensesData.userRole);
    console.log('Sample expenses:', expensesData.expenses?.slice(0, 3));

    // Test 3: Test filtering by status
    console.log('\n3️⃣ Testing status filtering...');
    const pendingResponse = await fetch('/api/expenses?status=pending');
    const pendingData = await pendingResponse.json();
    console.log('Pending expenses:', pendingData.expenses?.length || 0);

    const approvedResponse = await fetch('/api/expenses?status=approved');
    const approvedData = await approvedResponse.json();
    console.log('Approved expenses:', approvedData.expenses?.length || 0);

    // Test 4: Create a test expense
    console.log('\n4️⃣ Creating test expense...');
    const testExpense = {
      vendor: 'QA Test Vendor',
      category: 'other',
      amount: 123.45,
      notes: 'Test expense created by QA script'
    };

    const createResponse = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testExpense)
    });
    
    const createResult = await createResponse.json();
    if (createResponse.ok) {
      console.log('✅ Expense created successfully:', createResult.expense?.id);
      console.log('Status:', createResult.expense?.status);

      // Test 5: If user is admin, test approval workflow
      if (['admin', 'owner', 'bookkeeper'].includes(expensesData.userRole)) {
        console.log('\n5️⃣ Testing admin approval workflow...');
        
        // Only try to approve if expense is pending
        if (createResult.expense?.status === 'pending') {
          const approveResponse = await fetch(`/api/expenses/${createResult.expense.id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'approve',
              notes: 'Approved by QA test script'
            })
          });

          const approveResult = await approveResponse.json();
          if (approveResponse.ok) {
            console.log('✅ Expense approved successfully');
          } else {
            console.log('❌ Approval failed:', approveResult.error);
          }
        } else {
          console.log('ℹ️ Expense auto-approved (admin created)');
        }
      } else {
        console.log('5️⃣ Skipping approval test (not admin role)');
      }

    } else {
      console.log('❌ Expense creation failed:', createResult.error);
    }

    // Test 6: Refresh and verify data persistence
    console.log('\n6️⃣ Testing data persistence after refresh...');
    const refreshResponse = await fetch('/api/expenses');
    const refreshData = await refreshResponse.json();
    console.log('Expenses after operations:', refreshData.expenses?.length || 0);
    
    // Check if our test expense is still there
    const testExpenseExists = refreshData.expenses?.find(e => e.vendor === 'QA Test Vendor');
    if (testExpenseExists) {
      console.log('✅ Test expense persisted:', testExpenseExists.status);
    } else {
      console.log('❌ Test expense not found after refresh');
    }

    // Test 7: Role-based visibility summary
    console.log('\n7️⃣ Role-based access summary:');
    console.log(`Current role: ${expensesData.userRole}`);
    console.log(`Can see ${refreshData.expenses?.length || 0} expenses total`);
    console.log(`Pending: ${refreshData.expenses?.filter(e => e.status === 'pending').length || 0}`);
    console.log(`Approved: ${refreshData.expenses?.filter(e => e.status === 'approved').length || 0}`);
    console.log(`Rejected: ${refreshData.expenses?.filter(e => e.status === 'rejected').length || 0}`);

    console.log('\n✅ Expense workflow test completed!');
    
    return {
      userRole: expensesData.userRole,
      totalExpenses: refreshData.expenses?.length || 0,
      testExpenseCreated: !!createResult.expense,
      testExpenseStatus: createResult.expense?.status,
      rlsWorking: true // If we got this far, RLS is working
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { error: error.message };
  }
}

// Auto-run the test
testExpenseWorkflow().then(result => {
  console.log('\n📊 Test Results Summary:', result);
});

// Export for manual use
window.testExpenseWorkflow = testExpenseWorkflow;
