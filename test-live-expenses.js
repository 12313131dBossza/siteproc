// Direct test of expenses API functionality
const https = require('https')
const http = require('http')
const { URL } = require('url')

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const lib = parsedUrl.protocol === 'https:' ? https : http
    
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }
    
    const req = lib.request(reqOptions, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          text: () => Promise.resolve(data),
          ok: res.statusCode >= 200 && res.statusCode < 300
        })
      })
    })
    
    req.on('error', reject)
    
    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

async function testExpenses() {
  const DEPLOYMENT_URL = 'https://siteproc-e39wbetli-123s-projects-c0b14341.vercel.app'
  
  console.log('Testing expenses API functionality...')
  console.log('URL:', DEPLOYMENT_URL)
  
  try {
    // Test GET /api/expenses (this should work even without auth - just return 401)
    console.log('\n1. Testing GET /api/expenses...')
    const getResponse = await makeRequest(`${DEPLOYMENT_URL}/api/expenses`)
    console.log('Response status:', getResponse.status)
    
    if (getResponse.status === 500) {
      const errorText = await getResponse.text()
      console.log('❌ 500 Error - likely database issue:', errorText.substring(0, 200))
    } else if (getResponse.status === 401) {
      console.log('✅ 401 Authentication required - API is working!')
    } else {
      const data = await getResponse.text()
      console.log('Response:', data.substring(0, 200))
    }
    
    // Test POST /api/expenses (should also fail with 401, not 500)
    console.log('\n2. Testing POST /api/expenses...')
    const testData = {
      job_id: '96abb05f-5920-4ce9-9066-90411a660aac',
      amount: 25.50,
      memo: 'Test expense from direct API test',
      spent_at: '2025-09-13'
    }
    
    const postResponse = await makeRequest(`${DEPLOYMENT_URL}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    })
    
    console.log('POST Response status:', postResponse.status)
    
    if (postResponse.status === 500) {
      const errorText = await postResponse.text()
      console.log('❌ 500 Error - API has issues:', errorText.substring(0, 200))
    } else if (postResponse.status === 401) {
      console.log('✅ 401 Authentication required - API structure is working!')
    } else {
      const data = await postResponse.text()
      console.log('POST Response:', data.substring(0, 200))
    }
    
    // Test a debug endpoint to see server status
    console.log('\n3. Testing debug endpoint...')
    const debugResponse = await makeRequest(`${DEPLOYMENT_URL}/api/debug/ping`)
    console.log('Debug status:', debugResponse.status)
    
    if (debugResponse.ok) {
      const debugData = await debugResponse.text()
      console.log('Debug response:', debugData.substring(0, 100))
    }
    
  } catch (error) {
    console.error('Test error:', error.message)
  }
}

testExpenses()