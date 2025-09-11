// 🔍 API DIAGNOSIS SCRIPT
// Run this in browser console on your Vercel app

console.log('🚀 STARTING API DIAGNOSIS');

// Test the expenses API endpoint directly
async function testExpensesAPI() {
  try {
    console.log('📡 Testing /api/expenses endpoint...');
    
    const response = await fetch('/api/expenses', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('📊 Response data:', data);
    
    if (data.expenses) {
      console.log('✅ Found', data.expenses.length, 'expenses');
      console.log('👤 User role:', data.userRole);
      console.log('🔑 Is admin:', data.isAdmin);
      
      if (data.expenses.length > 0) {
        console.log('💰 First expense:', data.expenses[0]);
      }
    } else {
      console.log('❌ No expenses array in response');
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ API test failed:', error);
    return null;
  }
}

// Test with different parameters
async function testWithParams() {
  console.log('📡 Testing with showAll=true...');
  
  const response = await fetch('/api/expenses?showAll=true', {
    method: 'GET'
  });
  
  const data = await response.json();
  console.log('📊 ShowAll response:', data);
  
  return data;
}

// Run all tests
async function runAllTests() {
  console.log('🎯 Running comprehensive API tests...');
  
  const basicTest = await testExpensesAPI();
  const showAllTest = await testWithParams();
  
  console.log('📈 SUMMARY:');
  console.log('Basic API:', basicTest?.expenses?.length || 0, 'expenses');
  console.log('ShowAll API:', showAllTest?.expenses?.length || 0, 'expenses');
  
  // Check if user is authenticated
  try {
    const meResponse = await fetch('/api/me');
    const meData = await meResponse.json();
    console.log('👤 User info:', meData);
  } catch (error) {
    console.log('❌ Auth check failed:', error);
  }
}

// Execute
runAllTests();
