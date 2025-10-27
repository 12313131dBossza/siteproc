/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE 0 - SYSTEM AUDIT SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════
 * This script audits all pages and endpoints in the SiteProc application
 * Run this with: node phase0-system-audit.js
 * ═══════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

console.log('🏗️  SITEPROC PHASE 0 - SYSTEM AUDIT');
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('');

// Pages to audit
const pagesToAudit = [
  { name: 'Dashboard', path: '/(app)/dashboard/page.tsx', route: '/dashboard' },
  { name: 'Projects', path: '/projects/page.tsx', route: '/projects' },
  { name: 'Orders', path: '/orders/page.tsx', route: '/orders' },
  { name: 'Deliveries', path: '/deliveries/page.tsx', route: '/deliveries' },
  { name: 'Expenses', path: '/expenses/page.tsx', route: '/expenses' },
  { name: 'Payments', path: '/payments/page.tsx', route: '/payments' },
  { name: 'Products', path: '/products/page.tsx', route: '/products' },
  { name: 'Reports', path: '/reports/page.tsx', route: '/reports' },
  { name: 'Activity Log', path: '/activity/page.tsx', route: '/activity' },
  { name: 'Clients', path: '/clients/page.tsx', route: '/clients' },
  { name: 'Contractors', path: '/contractors/page.tsx', route: '/contractors' },
  { name: 'Bids', path: '/bids/page.tsx', route: '/bids' },
  { name: 'Companies', path: '/companies/page.tsx', route: '/companies' },
  { name: 'Change Orders', path: '/change-orders/page.tsx', route: '/change-orders' },
  { name: 'Profile', path: '/profile/page.tsx', route: '/profile' },
  { name: 'Settings', path: '/settings/page.tsx', route: '/settings' },
];

const auditResults = [];

console.log('📋 STEP 1: Checking Page Files');
console.log('────────────────────────────────────────────────────────────────────────────────');

pagesToAudit.forEach((page, index) => {
  const filePath = path.join(__dirname, 'src', 'app', page.path);
  const exists = fs.existsSync(filePath);
  
  const result = {
    page: page.name,
    route: page.route,
    filePath: page.path,
    fileExists: exists,
    queryEndpoint: '',
    result: '',
    error: '',
    fixProposal: '',
  };

  if (exists) {
    console.log(`✅ ${index + 1}. ${page.name.padEnd(20)} → ${page.path}`);
    result.result = 'File exists';
    
    // Read file and check for Supabase queries
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Look for Supabase queries
      const queries = content.match(/supabase\.from\(['"](.*?)['"]\)/g) || [];
      if (queries.length > 0) {
        const tables = queries.map(q => q.match(/from\(['"](.*?)['"]\)/)[1]);
        result.queryEndpoint = tables.join(', ');
        console.log(`   📊 Queries: ${tables.join(', ')}`);
      }
      
      // Check for common issues
      if (content.includes('// TODO') || content.includes('// FIXME')) {
        result.error = 'Contains TODO/FIXME comments';
        console.log(`   ⚠️  Contains TODO/FIXME comments`);
      }
      
      // Check for error handling
      if (!content.includes('try') && !content.includes('catch') && queries.length > 0) {
        result.error = (result.error ? result.error + '; ' : '') + 'No error handling';
        result.fixProposal = 'Add try-catch blocks for Supabase queries';
        console.log(`   ⚠️  No error handling detected`);
      }
      
    } catch (err) {
      result.error = `Cannot read file: ${err.message}`;
      console.log(`   ❌ Cannot read file: ${err.message}`);
    }
  } else {
    console.log(`❌ ${index + 1}. ${page.name.padEnd(20)} → NOT FOUND`);
    result.result = 'File not found';
    result.error = 'Page file does not exist';
    result.fixProposal = `Create page at src/app${page.path}`;
  }
  
  auditResults.push(result);
  console.log('');
});

console.log('');
console.log('📊 STEP 2: Checking Environment Variables');
console.log('────────────────────────────────────────────────────────────────────────────────');

const envPath = path.join(__dirname, '.env.local');
const envExists = fs.existsSync(envPath);

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SENDGRID_API_KEY',
];

let envStatus = {};

if (envExists) {
  console.log('✅ .env.local file found');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  requiredEnvVars.forEach(varName => {
    const found = envContent.includes(varName);
    envStatus[varName] = found;
    if (found) {
      console.log(`✅ ${varName}`);
    } else {
      console.log(`❌ ${varName} - MISSING`);
    }
  });
} else {
  console.log('❌ .env.local file NOT FOUND');
  requiredEnvVars.forEach(varName => {
    envStatus[varName] = false;
    console.log(`❌ ${varName} - NOT CONFIGURED`);
  });
}

console.log('');
console.log('🗄️  STEP 3: Checking Database Schema Files');
console.log('────────────────────────────────────────────────────────────────────────────────');

const criticalSqlFiles = [
  'UPDATE-NOTIFICATIONS-SAFE.sql',
  'ADD-DELIVERY-ITEMS.sql',
  'ADD-QUICKBOOKS-TABLES.sql',
  'BACKFILL-DELIVERIES-COMPANY-ID.sql',
];

criticalSqlFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  if (exists) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`⚠️  ${file} - Not found`);
  }
});

console.log('');
console.log('📦 STEP 4: Checking Package Dependencies');
console.log('────────────────────────────────────────────────────────────────────────────────');

const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const criticalDeps = {
    'next': packageJson.dependencies?.next || 'NOT INSTALLED',
    '@supabase/supabase-js': packageJson.dependencies?.['@supabase/supabase-js'] || 'NOT INSTALLED',
    'react': packageJson.dependencies?.react || 'NOT INSTALLED',
    'tailwindcss': packageJson.devDependencies?.tailwindcss || 'NOT INSTALLED',
  };
  
  Object.entries(criticalDeps).forEach(([pkg, version]) => {
    if (version === 'NOT INSTALLED') {
      console.log(`❌ ${pkg.padEnd(30)} - NOT INSTALLED`);
    } else {
      console.log(`✅ ${pkg.padEnd(30)} → ${version}`);
    }
  });
} else {
  console.log('❌ package.json not found');
}

console.log('');
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('📊 AUDIT SUMMARY');
console.log('════════════════════════════════════════════════════════════════════════════════');

const totalPages = auditResults.length;
const pagesExist = auditResults.filter(r => r.fileExists).length;
const pagesWithErrors = auditResults.filter(r => r.error).length;
const pagesWithQueries = auditResults.filter(r => r.queryEndpoint).length;

console.log(`Total Pages Checked:     ${totalPages}`);
console.log(`Pages Found:             ${pagesExist} (${Math.round((pagesExist/totalPages)*100)}%)`);
console.log(`Pages Missing:           ${totalPages - pagesExist}`);
console.log(`Pages with Issues:       ${pagesWithErrors}`);
console.log(`Pages with DB Queries:   ${pagesWithQueries}`);
console.log('');

const envConfigured = Object.values(envStatus).filter(v => v).length;
const envTotal = requiredEnvVars.length;
console.log(`Environment Variables:   ${envConfigured}/${envTotal} configured`);
console.log('');

// Generate detailed report
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('📋 DETAILED FINDINGS');
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('');

console.table(auditResults.map(r => ({
  Page: r.page,
  Status: r.fileExists ? '✅' : '❌',
  Tables: r.queryEndpoint || 'N/A',
  Issues: r.error || 'None',
  Fix: r.fixProposal || 'N/A',
})));

console.log('');
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🎯 NEXT STEPS');
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('');

if (totalPages - pagesExist > 0) {
  console.log(`1. ⚠️  Create ${totalPages - pagesExist} missing page(s)`);
}

if (envConfigured < envTotal) {
  console.log(`2. ⚠️  Configure ${envTotal - envConfigured} missing environment variable(s)`);
}

if (pagesWithErrors > 0) {
  console.log(`3. ⚠️  Fix issues in ${pagesWithErrors} page(s)`);
}

console.log('4. 🔍 Test all pages manually in browser at http://localhost:3000');
console.log('5. 📊 Check browser console and network tab for runtime errors');
console.log('6. 🗄️  Run Supabase SQL scripts to ensure database is up to date');
console.log('7. 🔐 Verify RLS policies for all tables in Supabase dashboard');
console.log('');

// Save report to file
const reportPath = path.join(__dirname, 'PHASE0-AUDIT-REPORT.md');
let markdown = `# 🏗 SITEPROC - Phase 0 System Audit Report

**Generated:** ${new Date().toLocaleString()}

---

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| Total Pages Checked | ${totalPages} |
| Pages Found | ${pagesExist} (${Math.round((pagesExist/totalPages)*100)}%) |
| Pages Missing | ${totalPages - pagesExist} |
| Pages with Issues | ${pagesWithErrors} |
| Pages with DB Queries | ${pagesWithQueries} |
| Environment Variables | ${envConfigured}/${envTotal} configured |

---

## 📋 Page Audit Results

| Page | Status | Route | Database Tables | Issues | Fix Proposal |
|------|--------|-------|-----------------|--------|--------------|
`;

auditResults.forEach(r => {
  markdown += `| ${r.page} | ${r.fileExists ? '✅' : '❌'} | ${r.route} | ${r.queryEndpoint || 'N/A'} | ${r.error || 'None'} | ${r.fixProposal || 'N/A'} |\n`;
});

markdown += `
---

## 🔐 Environment Variables Status

| Variable | Status |
|----------|--------|
`;

Object.entries(envStatus).forEach(([key, value]) => {
  markdown += `| ${key} | ${value ? '✅ Configured' : '❌ Missing'} |\n`;
});

markdown += `
---

## 🎯 Critical Issues Found

`;

const criticalIssues = auditResults.filter(r => !r.fileExists || r.error);
if (criticalIssues.length > 0) {
  criticalIssues.forEach((issue, idx) => {
    markdown += `
### ${idx + 1}. ${issue.page}
- **Route:** ${issue.route}
- **Issue:** ${issue.error || 'File not found'}
- **Fix:** ${issue.fixProposal || 'Create the page file'}
`;
  });
} else {
  markdown += `
✅ No critical issues found!
`;
}

markdown += `
---

## 🔍 Recommendations

### Immediate Actions Required:
`;

if (totalPages - pagesExist > 0) {
  markdown += `1. ⚠️ **Create Missing Pages:** ${totalPages - pagesExist} page(s) not found\n`;
}

if (envConfigured < envTotal) {
  markdown += `2. ⚠️ **Configure Environment:** ${envTotal - envConfigured} variable(s) missing\n`;
}

if (pagesWithErrors > 0) {
  markdown += `3. ⚠️ **Fix Page Issues:** ${pagesWithErrors} page(s) have errors\n`;
}

markdown += `
### Testing Checklist:
- [ ] Test all pages manually in browser
- [ ] Check browser console for JavaScript errors
- [ ] Check network tab for failed API calls
- [ ] Verify Supabase authentication works
- [ ] Test all database queries for each page
- [ ] Verify RLS policies are working correctly
- [ ] Test mobile responsiveness
- [ ] Verify all forms submit correctly

---

## 📝 Notes

- Development server running at: http://localhost:3000
- Supabase project: Check .env.local for URL
- Next.js version: ${packageJson?.dependencies?.next || 'Unknown'}
- Last updated: ${new Date().toLocaleString()}

---

**Status:** ${pagesExist === totalPages && envConfigured === envTotal ? '✅ System Ready' : '⚠️ Action Required'}
`;

fs.writeFileSync(reportPath, markdown);

console.log(`✅ Detailed report saved to: PHASE0-AUDIT-REPORT.md`);
console.log('');
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('✨ AUDIT COMPLETE!');
console.log('════════════════════════════════════════════════════════════════════════════════');
