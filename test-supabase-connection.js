#!/usr/bin/env node

/**
 * Test Supabase connection and authentication setup
 * Run with: node test-supabase-connection.js
 */

const https = require('https');

const SUPABASE_URL = 'https://vrkgtygzcokqoeeutvxd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4Njc2NjIsImV4cCI6MjA3MTQ0MzY2Mn0.rBYMsJmz0hGNDpfSa2zd6U8KeBpNSgzCwF8H_2P9LYQ';
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya2d0eWd6Y29rcW9lZXV0dnhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg2NzY2MiwiZXhwIjoyMDcxNDQzNjYyfQ._0Ln-gipoPTEvOWT7N4ISmxaNOyk5YsFrusH1fPSnMI';

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      path,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data ? JSON.parse(data) : null
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🔍 Testing Supabase Connection...\n');

  try {
    // Test 1: Health check
    console.log('Test 1: Health Check');
    console.log('URL:', SUPABASE_URL);
    try {
      const health = await makeRequest('GET', '/health', {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      });
      console.log(`✅ Health check: ${health.status}`);
    } catch (err) {
      console.log(`❌ Health check failed: ${err.message}`);
    }

    // Test 2: Test auth endpoint
    console.log('\nTest 2: Auth Endpoint');
    try {
      const auth = await makeRequest('GET', '/auth/v1/settings', {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      });
      console.log(`✅ Auth endpoint: ${auth.status}`);
      if (auth.body?.external?.email) {
        console.log(`✅ Email auth is enabled`);
      }
    } catch (err) {
      console.log(`❌ Auth endpoint failed: ${err.message}`);
    }

    // Test 3: Test REST API
    console.log('\nTest 3: REST API');
    try {
      const rest = await makeRequest('GET', '/rest/v1/', {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      });
      console.log(`✅ REST API: ${rest.status}`);
    } catch (err) {
      console.log(`❌ REST API failed: ${err.message}`);
    }

    // Test 4: Test profiles table
    console.log('\nTest 4: Profiles Table');
    try {
      const profiles = await makeRequest('GET', '/rest/v1/profiles?limit=1', {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      });
      console.log(`✅ Profiles table: ${profiles.status}`);
      if (profiles.status === 200) {
        console.log(`✅ Database connection working`);
      }
    } catch (err) {
      console.log(`❌ Profiles table failed: ${err.message}`);
    }

    console.log('\n✅ All tests completed!');
  } catch (err) {
    console.error('\n❌ Fatal error:', err);
  }
}

runTests();
