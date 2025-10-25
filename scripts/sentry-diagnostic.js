#!/usr/bin/env node

/**
 * Sentry Diagnostic Script
 * 
 * This script checks your Sentry configuration and tells you exactly
 * what's needed to make Sentry work properly.
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 SENTRY DIAGNOSTIC TOOL\n');
console.log('=' .repeat(60));

const issues = [];
const warnings = [];
const success = [];

// Check 1: Environment Variables
console.log('\n📋 Step 1: Checking Environment Variables...\n');

const requiredEnvVars = {
  'NEXT_PUBLIC_SENTRY_DSN': {
    required: true,
    description: 'Public DSN for client-side error tracking',
    example: 'https://[key]@[org].ingest.sentry.io/[project]',
    where: 'Get from Sentry.io → Settings → Client Keys (DSN)'
  },
  'SENTRY_ORG': {
    required: false,
    description: 'Your Sentry organization slug (only for source map upload)',
    example: 'site-proc',
    where: 'Get from Sentry.io → Settings → Organization Settings'
  },
  'SENTRY_PROJECT': {
    required: false,
    description: 'Your Sentry project slug (only for source map upload)',
    example: 'javascript-nextjs',
    where: 'Get from Sentry.io → Settings → Projects'
  },
  'SENTRY_AUTH_TOKEN': {
    required: false,
    description: 'Auth token for source map upload (optional)',
    example: 'sntrys_...',
    where: 'Get from Sentry.io → Settings → Auth Tokens'
  }
};

for (const [envVar, info] of Object.entries(requiredEnvVars)) {
  const value = process.env[envVar];
  
  if (value) {
    const masked = value.includes('http') 
      ? value.substring(0, 30) + '...' 
      : value.substring(0, 15) + '...';
    success.push(`✅ ${envVar}: ${masked}`);
    console.log(`  ✅ ${envVar}: Set (${masked})`);
  } else {
    if (info.required) {
      issues.push({
        type: 'CRITICAL',
        var: envVar,
        message: `Missing: ${envVar}`,
        fix: `Add this to Vercel environment variables:\n     Name: ${envVar}\n     Value: ${info.example}\n     Where to get: ${info.where}`
      });
      console.log(`  ❌ ${envVar}: MISSING (REQUIRED)`);
    } else {
      warnings.push({
        type: 'OPTIONAL',
        var: envVar,
        message: `Missing: ${envVar} (optional)`,
        fix: `If you want source map upload, add:\n     Name: ${envVar}\n     Value: ${info.example}\n     Where to get: ${info.where}`
      });
      console.log(`  ⚠️  ${envVar}: Missing (optional for source maps)`);
    }
  }
}

// Check 2: Required Files
console.log('\n📁 Step 2: Checking Required Files...\n');

const requiredFiles = [
  {
    path: 'src/components/SentryInitializer.tsx',
    description: 'Client-side Sentry initialization component'
  },
  {
    path: 'sentry.client.config.ts',
    description: 'Client-side Sentry config'
  },
  {
    path: 'sentry.server.config.ts',
    description: 'Server-side Sentry config'
  },
  {
    path: 'instrumentation.ts',
    description: 'Next.js 15 instrumentation hook'
  }
];

for (const file of requiredFiles) {
  const filePath = path.join(process.cwd(), file.path);
  if (fs.existsSync(filePath)) {
    success.push(`✅ ${file.path}: Exists`);
    console.log(`  ✅ ${file.path}: Found`);
  } else {
    issues.push({
      type: 'CRITICAL',
      message: `Missing file: ${file.path}`,
      fix: `This file is required for Sentry. Ask me to create it.`
    });
    console.log(`  ❌ ${file.path}: MISSING`);
  }
}

// Check 3: Package.json
console.log('\n📦 Step 3: Checking Package Dependencies...\n');

const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (packageJson.dependencies && packageJson.dependencies['@sentry/nextjs']) {
    const version = packageJson.dependencies['@sentry/nextjs'];
    success.push(`✅ @sentry/nextjs: ${version}`);
    console.log(`  ✅ @sentry/nextjs: ${version}`);
  } else {
    issues.push({
      type: 'CRITICAL',
      message: 'Missing package: @sentry/nextjs',
      fix: 'Run: npm install @sentry/nextjs'
    });
    console.log(`  ❌ @sentry/nextjs: NOT INSTALLED`);
  }
} else {
  issues.push({
    type: 'CRITICAL',
    message: 'package.json not found',
    fix: 'This script must be run from the project root'
  });
  console.log(`  ❌ package.json: NOT FOUND`);
}

// Check 4: Next.js Config
console.log('\n⚙️  Step 4: Checking Next.js Configuration...\n');

const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
if (fs.existsSync(nextConfigPath)) {
  const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
  
  if (nextConfig.includes('withSentryConfig')) {
    success.push(`✅ next.config.ts: withSentryConfig enabled`);
    console.log(`  ✅ withSentryConfig: Enabled`);
  } else {
    warnings.push({
      type: 'WARNING',
      message: 'next.config.ts missing withSentryConfig',
      fix: 'Sentry may not work without withSentryConfig wrapper'
    });
    console.log(`  ⚠️  withSentryConfig: Not found`);
  }
  
  if (nextConfig.includes('instrumentationHook: true')) {
    success.push(`✅ Instrumentation hook: Enabled`);
    console.log(`  ✅ instrumentationHook: Enabled (required for Next.js 15)`);
  } else {
    issues.push({
      type: 'CRITICAL',
      message: 'Missing: experimental.instrumentationHook',
      fix: 'Add to next.config.ts:\n     experimental: { instrumentationHook: true }'
    });
    console.log(`  ❌ instrumentationHook: Missing (required for Next.js 15)`);
  }
} else {
  issues.push({
    type: 'CRITICAL',
    message: 'next.config.ts not found',
    fix: 'Next.js config file is missing'
  });
  console.log(`  ❌ next.config.ts: NOT FOUND`);
}

// Check 5: Layout Integration
console.log('\n🎨 Step 5: Checking Layout Integration...\n');

const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
if (fs.existsSync(layoutPath)) {
  const layout = fs.readFileSync(layoutPath, 'utf8');
  
  if (layout.includes('SentryInitializer')) {
    success.push(`✅ layout.tsx: SentryInitializer added`);
    console.log(`  ✅ SentryInitializer: Found in layout.tsx`);
  } else {
    issues.push({
      type: 'CRITICAL',
      message: 'SentryInitializer not added to layout.tsx',
      fix: 'Add <SentryInitializer /> to your root layout'
    });
    console.log(`  ❌ SentryInitializer: Not found in layout.tsx`);
  }
} else {
  warnings.push({
    type: 'WARNING',
    message: 'src/app/layout.tsx not found',
    fix: 'Cannot verify SentryInitializer integration'
  });
  console.log(`  ⚠️  layout.tsx: Not found (cannot verify)`);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 DIAGNOSTIC SUMMARY\n');

console.log(`✅ Success: ${success.length} checks passed`);
console.log(`❌ Issues: ${issues.length} critical issues found`);
console.log(`⚠️  Warnings: ${warnings.length} optional warnings`);

// Critical Issues
if (issues.length > 0) {
  console.log('\n' + '='.repeat(60));
  console.log('\n🚨 CRITICAL ISSUES (MUST FIX)\n');
  
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.message}`);
    console.log(`   Fix: ${issue.fix}`);
    console.log('');
  });
}

// Warnings
if (warnings.length > 0) {
  console.log('\n' + '='.repeat(60));
  console.log('\n⚠️  WARNINGS (OPTIONAL)\n');
  
  warnings.forEach((warning, index) => {
    console.log(`${index + 1}. ${warning.message}`);
    console.log(`   Info: ${warning.fix}`);
    console.log('');
  });
}

// Final Instructions
console.log('\n' + '='.repeat(60));
console.log('\n🎯 WHAT TO DO NEXT\n');

if (issues.length === 0 && warnings.length === 0) {
  console.log('✅ Everything looks good! Sentry should be working.');
  console.log('\nTo test:');
  console.log('1. Deploy your app to Vercel');
  console.log('2. Open browser console on your site');
  console.log('3. Run: console.log("Sentry?", typeof window.Sentry)');
  console.log('4. You should see: Sentry? object');
  console.log('5. Trigger an error: throw new Error("Test")');
  console.log('6. Check Sentry dashboard for the error\n');
} else if (issues.filter(i => i.var === 'NEXT_PUBLIC_SENTRY_DSN').length > 0) {
  console.log('🔑 STEP 1: Get your Sentry DSN');
  console.log('   1. Go to https://sentry.io');
  console.log('   2. Login and select your project');
  console.log('   3. Go to Settings → Client Keys (DSN)');
  console.log('   4. Copy the DSN URL\n');
  
  console.log('🔧 STEP 2: Add DSN to Vercel');
  console.log('   1. Go to Vercel → Your Project → Settings → Environment Variables');
  console.log('   2. Add new variable:');
  console.log('      Name: NEXT_PUBLIC_SENTRY_DSN');
  console.log('      Value: [your DSN from step 1]');
  console.log('      Environment: Production, Preview, Development (all three)');
  console.log('   3. Save and redeploy\n');
  
  console.log('🚀 STEP 3: Test');
  console.log('   1. Wait for deployment to finish');
  console.log('   2. Run this script again: node scripts/sentry-diagnostic.js');
  console.log('   3. If all checks pass, test in browser\n');
} else {
  console.log('Fix the critical issues listed above, then:');
  console.log('1. Run this diagnostic again: node scripts/sentry-diagnostic.js');
  console.log('2. Deploy to Vercel');
  console.log('3. Test in browser console\n');
}

console.log('='.repeat(60));

// Exit with error code if there are critical issues
process.exit(issues.length > 0 ? 1 : 0);
