#!/usr/bin/env node

/**
 * Phase 0: Pre-Flight System Check
 * Tests all major pages and API endpoints on https://siteproc1.vercel.app/
 */

const BASE_URL = 'https://siteproc1.vercel.app';

// Define all pages to test
const pages = [
  { path: '/', name: 'Home/Dashboard' },
  { path: '/deliveries', name: 'Deliveries' },
  { path: '/orders', name: 'Orders' },
  { path: '/projects', name: 'Projects' },
  { path: '/expenses', name: 'Expenses' },
  { path: '/payments', name: 'Payments' },
  { path: '/products', name: 'Products' },
  { path: '/reports', name: 'Reports' },
  { path: '/activity-log', name: 'Activity Log' },
  { path: '/users', name: 'Users & Roles' },
  { path: '/clients', name: 'Clients' },
  { path: '/contractors', name: 'Contractors' },
  { path: '/bids', name: 'Bids' },
  { path: '/change-orders', name: 'Change Orders' },
];

// Define all API endpoints to test
const apiEndpoints = [
  { path: '/api/deliveries', method: 'GET', name: 'List deliveries' },
  { path: '/api/orders', method: 'GET', name: 'List orders' },
  { path: '/api/projects', method: 'GET', name: 'List projects' },
  { path: '/api/expenses', method: 'GET', name: 'List expenses' },
  { path: '/api/payments', method: 'GET', name: 'List payments' },
  { path: '/api/products', method: 'GET', name: 'List products' },
  { path: '/api/activity-logs', method: 'GET', name: 'List activity logs' },
  { path: '/api/health', method: 'GET', name: 'Health check' },
];

async function testPage(page) {
  try {
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}${page.path}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Phase0-SystemCheck/1.0',
      },
    });
    const duration = Date.now() - startTime;

    const status = response.ok ? '✅ OK' : `❌ ${response.status}`;
    const details = response.ok ? `${duration}ms` : response.statusText;

    console.log(`${page.name.padEnd(30)} ${status.padEnd(20)} ${details}`);
    return { page: page.name, status: response.ok, code: response.status, time: duration };
  } catch (error) {
    console.log(`${page.name.padEnd(30)} ❌ ERROR${' '.padEnd(14)} ${error.message}`);
    return { page: page.name, status: false, error: error.message };
  }
}

async function testAPI(endpoint) {
  try {
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}${endpoint.path}`, {
      method: endpoint.method,
      headers: {
        'User-Agent': 'Phase0-SystemCheck/1.0',
        'Accept': 'application/json',
      },
    });
    const duration = Date.now() - startTime;

    const status = response.ok ? '✅ OK' : `❌ ${response.status}`;
    const details = response.ok ? `${duration}ms` : response.statusText;

    console.log(
      `${endpoint.method} ${endpoint.path.padEnd(25)} ${status.padEnd(20)} ${details}`
    );
    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      status: response.ok,
      code: response.status,
      time: duration,
    };
  } catch (error) {
    console.log(
      `${endpoint.method} ${endpoint.path.padEnd(25)} ❌ ERROR${' '.padEnd(14)} ${error.message}`
    );
    return { endpoint: endpoint.path, method: endpoint.method, status: false, error: error.message };
  }
}

async function runCheck() {
  console.log('\n🚀 PHASE 0: PRE-FLIGHT SYSTEM CHECK');
  console.log(`📍 Deployment: ${BASE_URL}`);
  console.log(`⏰ Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
  console.log('━'.repeat(80));

  console.log('\n📄 PAGES TEST\n');
  const pageResults = [];
  for (const page of pages) {
    const result = await testPage(page);
    pageResults.push(result);
  }

  console.log('\n🔌 API ENDPOINTS TEST\n');
  const apiResults = [];
  for (const endpoint of apiEndpoints) {
    const result = await testAPI(endpoint);
    apiResults.push(result);
  }

  // Summary
  console.log('\n' + '━'.repeat(80));
  console.log('\n📊 SUMMARY\n');

  const pagesPassed = pageResults.filter((r) => r.status).length;
  const pagesFailed = pageResults.filter((r) => !r.status).length;
  const apiPassed = apiResults.filter((r) => r.status).length;
  const apiFailed = apiResults.filter((r) => !r.status).length;

  console.log(`Pages:       ${pagesPassed}/${pages.length} passed ${pagesFailed > 0 ? `(${pagesFailed} failed)` : '✅'}`);
  console.log(`API:         ${apiPassed}/${apiEndpoints.length} passed ${apiFailed > 0 ? `(${apiFailed} failed)` : '✅'}`);

  if (pagesFailed === 0 && apiFailed === 0) {
    console.log('\n✅ ALL SYSTEMS GO - Ready for Phase 1A (Deliveries Workflow)');
  } else {
    console.log('\n⚠️  ISSUES DETECTED - Review failed endpoints above');
  }

  console.log('\n' + '━'.repeat(80));
}

runCheck().catch(console.error);
