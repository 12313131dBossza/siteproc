// Test expense creation through API
const fetch = require('node-fetch')

const VERCEL_URL = 'https://siteproc-d2kycjird-123s-projects-c0b14341.vercel.app'

async function testExpenseCreation() {
  try {
    console.log('Testing expense creation API...')
    
    // First, let's try to get existing expenses to check API works
    console.log('\n1. Testing GET /api/expenses...')
    const getResponse = await fetch(`${VERCEL_URL}/api/expenses`)
    console.log('GET Response status:', getResponse.status)
    
    if (getResponse.status === 401) {
      console.log('❌ Not authenticated - this is expected for API testing')
      console.log('The API requires authentication. You need to test from the frontend.')
      return
    }
    
    const getData = await getResponse.text()
    console.log('GET Response:', getData.substring(0, 200) + '...')
    
    // Try POST request
    console.log('\n2. Testing POST /api/expenses...')
    const testExpense = {
      project_id: '96abb05f-5920-4ce9-9066-90411a660aac', // From debug output
      amount: 25.50,
      description: 'Test expense from API script',
      category: 'testing'
    }
    
    const postResponse = await fetch(`${VERCEL_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testExpense)
    })
    
    console.log('POST Response status:', postResponse.status)
    const postData = await postResponse.text()
    console.log('POST Response:', postData.substring(0, 400) + '...')
    
  } catch (error) {
    console.error('Test error:', error)
  }
}

testExpenseCreation()