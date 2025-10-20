#!/usr/bin/env node

/**
 * PHASE 0: Automated Pre-Flight System Check
 * Tests all major endpoints to identify failures
 * Runs against: http://localhost:3000
 */

const BASE_URL = 'http://localhost:3000';

// Test configuration
const ENDPOINTS = [
  // Core modules
  { name: 'Orders', path: '/api/orders', method: 'GET' },
  { name: 'Deliveries', path: '/api/order-deliveries', method: 'GET' },
  { name: 'Projects', path: '/api/projects', method: 'GET' },
  { name: 'Expenses', path: '/api/expenses', method: 'GET' },
  { name: 'Products', path: '/api/products', method: 'GET' },
  { name: 'Activity Log', path: '/api/activity', method: 'GET' },
  
  // Reports
  { name: 'Reports - Projects', path: '/api/reports/projects', method: 'GET' },
  { name: 'Reports - Payments', path: '/api/reports/payments', method: 'GET' },
  { name: 'Reports - Deliveries', path: '/api/reports/deliveries', method: 'GET' },
  
  // Supporting modules (may not exist yet)
  { name: 'Clients', path: '/api/clients', method: 'GET' },
  { name: 'Contractors', path: '/api/contractors', method: 'GET' },
  { name: 'Bids', path: '/api/bids', method: 'GET' },
  { name: 'Change Orders', path: '/api/change-orders', method: 'GET' },
  { name: 'Users', path: '/api/users', method: 'GET' },
];

const PAGES = [
  { name: 'Dashboard', path: '/' },
  { name: 'Orders', path: '/orders' },
  { name: 'Deliveries', path: '/deliveries' },
  { name: 'Projects', path: '/projects' },
  { name: 'Expenses', path: '/expenses' },
  { name: 'Payments', path: '/admin/payments' },
  { name: 'Products', path: '/products' },
  { name: 'Reports', path: '/admin/reports' },
  { name: 'Activity Log', path: '/activity' },
  { name: 'Settings', path: '/admin/settings' },
];

// Colors for terminal output
const COLORS = {
  RESET: '\x1b[0m',
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
};

async function testEndpoint(endpoint) {
  try {
    const url = `${BASE_URL}${endpoint.path}`;
    const startTime = Date.now();
    
    const response = await fetch(url, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });
    
    const duration = Date.now() - startTime;
    const isOk = response.ok;
    
    return {
      name: endpoint.name,
      path: endpoint.path,
      status: response.status,
      ok: isOk,
      duration,
      error: null,
    };
  } catch (error) {
    return {
      name: endpoint.name,
      path: endpoint.path,
      status: null,
      ok: false,
      duration: null,
      error: error.message || 'Unknown error',
    };
  }
}

async function testPage(page) {
  try {
    const url = `${BASE_URL}${page.path}`;
    const startTime = Date.now();
    
    const response = await fetch(url, {
      method: 'GET',
      timeout: 10000,
    });
    
    const duration = Date.now() - startTime;
    const isOk = response.status === 200;
    
    return {
      name: page.name,
      path: page.path,
      status: response.status,
      ok: isOk,
      duration,
      error: null,
    };
  } catch (error) {
    return {
      name: page.name,
      path: page.path,
      status: null,
      ok: false,
      duration: null,
      error: error.message || 'Unknown error',
    };
  }
}

function formatResult(result) {
  const statusIcon = result.ok ? `${COLORS.GREEN}✅${COLORS.RESET}` : `${COLORS.RED}❌${COLORS.RESET}`;
  const statusCode = result.status ? `${result.status}` : 'N/A';
  const duration = result.duration ? `${result.duration}ms` : 'N/A';
  const errorMsg = result.error ? ` - ${result.error}` : '';
  
  return `${statusIcon} ${result.name.padEnd(25)} | ${statusCode.padEnd(4)} | ${duration.padEnd(8)}${errorMsg}`;
}

async function runTests() {
  console.log(`${COLORS.CYAN}${'='.repeat(80)}${COLORS.RESET}`);
  console.log(`${COLORS.BLUE}📊 SITEPROC PHASE 0: PRE-FLIGHT SYSTEM CHECK${COLORS.RESET}`);
  console.log(`${COLORS.BLUE}Target: ${BASE_URL}${COLORS.RESET}`);
  console.log(`${COLORS.BLUE}Time: ${new Date().toISOString()}${COLORS.RESET}`);
  console.log(`${COLORS.CYAN}${'='.repeat(80)}${COLORS.RESET}\n`);

  // Test pages
  console.log(`${COLORS.YELLOW}🌐 TESTING PAGES${COLORS.RESET}`);
  console.log(`${COLORS.CYAN}${'─'.repeat(80)}${COLORS.RESET}`);
  
  const pageResults = [];
  for (const page of PAGES) {
    const result = await testPage(page);
    pageResults.push(result);
    console.log(formatResult(result));
  }

  const pagesWorking = pageResults.filter(r => r.ok).length;
  const pagesFailing = pageResults.filter(r => !r.ok).length;

  console.log(`${COLORS.CYAN}${'─'.repeat(80)}${COLORS.RESET}`);
  console.log(`${COLORS.GREEN}✅ Working: ${pagesWorking}${COLORS.RESET} | ${COLORS.RED}❌ Failing: ${pagesFailing}${COLORS.RESET}\n`);

  // Test endpoints
  console.log(`${COLORS.YELLOW}🔌 TESTING API ENDPOINTS${COLORS.RESET}`);
  console.log(`${COLORS.CYAN}${'─'.repeat(80)}${COLORS.RESET}`);
  
  const endpointResults = [];
  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    endpointResults.push(result);
    console.log(formatResult(result));
  }

  const endpointsWorking = endpointResults.filter(r => r.ok).length;
  const endpointsFailing = endpointResults.filter(r => !r.ok).length;

  console.log(`${COLORS.CYAN}${'─'.repeat(80)}${COLORS.RESET}`);
  console.log(`${COLORS.GREEN}✅ Working: ${endpointsWorking}${COLORS.RESET} | ${COLORS.RED}❌ Failing: ${endpointsFailing}${COLORS.RESET}\n`);

  // Summary
  console.log(`${COLORS.CYAN}${'='.repeat(80)}${COLORS.RESET}`);
  console.log(`${COLORS.YELLOW}📊 SUMMARY${COLORS.RESET}`);
  console.log(`${COLORS.CYAN}${'─'.repeat(80)}${COLORS.RESET}`);
  console.log(`Pages:     ${COLORS.GREEN}${pagesWorking}✅${COLORS.RESET} / ${pageResults.length} | ${COLORS.RED}${pagesFailing}❌${COLORS.RESET}`);
  console.log(`Endpoints: ${COLORS.GREEN}${endpointsWorking}✅${COLORS.RESET} / ${endpointResults.length} | ${COLORS.RED}${endpointsFailing}❌${COLORS.RESET}`);
  
  const totalWorking = pagesWorking + endpointsWorking;
  const totalTests = pageResults.length + endpointResults.length;
  const percentage = Math.round((totalWorking / totalTests) * 100);
  
  console.log(`${COLORS.CYAN}${'─'.repeat(80)}${COLORS.RESET}`);
  console.log(`Overall: ${COLORS.BLUE}${percentage}%${COLORS.RESET} (${totalWorking}/${totalTests}) ✅\n`);

  // Detailed failures
  const failures = [...pageResults, ...endpointResults].filter(r => !r.ok);
  
  if (failures.length > 0) {
    console.log(`${COLORS.RED}❌ FAILURES REQUIRING ATTENTION${COLORS.RESET}`);
    console.log(`${COLORS.CYAN}${'─'.repeat(80)}${COLORS.RESET}`);
    failures.forEach((failure, idx) => {
      console.log(`\n${idx + 1}. ${failure.name}`);
      console.log(`   Path: ${failure.path}`);
      console.log(`   Status: ${failure.status || 'No response'}`);
      console.log(`   Error: ${failure.error || 'Unknown'}`);
    });
    console.log(`\n${COLORS.CYAN}${'─'.repeat(80)}${COLORS.RESET}\n`);
  }

  // Recommendations
  console.log(`${COLORS.YELLOW}📝 NEXT STEPS${COLORS.RESET}`);
  console.log(`${COLORS.CYAN}${'─'.repeat(80)}${COLORS.RESET}`);
  if (percentage === 100) {
    console.log(`${COLORS.GREEN}🎉 All systems operational! Ready to proceed to Phase 1A.${COLORS.RESET}`);
  } else if (percentage >= 80) {
    console.log(`${COLORS.YELLOW}⚠️  Most systems working. Fix ${failures.length} critical issues before Phase 1A.${COLORS.RESET}`);
  } else {
    console.log(`${COLORS.RED}🚨 Multiple failures detected. Investigate and fix before proceeding.${COLORS.RESET}`);
  }
  
  console.log(`${COLORS.CYAN}${'='.repeat(80)}${COLORS.RESET}\n`);
}

// Run tests
runTests().catch(err => {
  console.error(`${COLORS.RED}Fatal error:${COLORS.RESET}`, err);
  process.exit(1);
});
