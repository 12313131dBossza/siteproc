/**
 * Test Delay Shield™ AI - Quick Diagnostic
 * 
 * Run this in your browser console on the SiteProc app (after login)
 * OR run it server-side with Node.js after setting up the env vars
 */

// Browser version - paste this into console at https://your-app-url.vercel.app

async function testDelayShield() {
  console.log('🛡️ Testing Delay Shield™ AI...\n');

  // 1. Check if we can access the API
  console.log('1️⃣ Checking API access...');
  try {
    const alertsRes = await fetch('/api/ai/delay-shield');
    const alertsData = await alertsRes.json();
    console.log('   Status:', alertsRes.status);
    console.log('   Response:', alertsData);
    
    if (alertsRes.status === 401) {
      console.log('   ❌ Not authenticated - make sure you are logged in');
      return;
    }
    if (alertsRes.status === 403) {
      console.log('   ❌ Not Enterprise plan - upgrade required');
      return;
    }
  } catch (e) {
    console.log('   ❌ API Error:', e.message);
  }

  // 2. Check projects
  console.log('\n2️⃣ Checking projects...');
  try {
    const projectsRes = await fetch('/api/projects');
    const projectsData = await projectsRes.json();
    const projects = projectsData.data || [];
    
    console.log('   Found', projects.length, 'projects');
    
    if (projects.length === 0) {
      console.log('   ⚠️ No projects found - create a project first!');
      return;
    }

    // Check project data quality
    projects.forEach((p, i) => {
      console.log(`\n   Project ${i + 1}: ${p.name}`);
      console.log('   - ID:', p.id);
      console.log('   - Status:', p.status || '❌ missing');
      console.log('   - Budget:', p.budget || '❌ missing (needed for $ impact)');
      console.log('   - Start Date:', p.start_date || '⚠️ missing');
      console.log('   - End Date:', p.end_date || '⚠️ missing');
      console.log('   - Location:', p.location || p.address || '⚠️ missing (needed for weather)');
    });
  } catch (e) {
    console.log('   ❌ Projects Error:', e.message);
  }

  // 3. Run the scan
  console.log('\n3️⃣ Running Delay Shield scan...');
  try {
    const scanRes = await fetch('/api/ai/delay-shield', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scan_all: true })  // IMPORTANT: must pass scan_all: true
    });
    const scanData = await scanRes.json();
    
    console.log('   Scan Status:', scanRes.status);
    console.log('   Response:', scanData);
    
    if (scanData.data && scanData.data.length > 0) {
      console.log('\n   ✅ ALERTS GENERATED:');
      scanData.data.forEach((alert, i) => {
        console.log(`\n   Alert ${i + 1}:`);
        console.log('   - Project:', alert.project_name || alert.project_id);
        console.log('   - Risk Level:', alert.risk_level);
        console.log('   - Risk Score:', (alert.risk_score * 100).toFixed(0) + '%');
        console.log('   - Delay Days:', alert.predicted_delay_days);
        console.log('   - Financial Impact: €' + alert.financial_impact);
        console.log('   - Factors:', alert.contributing_factors?.length || 0);
      });
    } else {
      console.log('\n   ℹ️ No alerts generated - projects look healthy!');
      console.log('   Tip: To trigger alerts, try adding:');
      console.log('   - Orders with past expected_delivery dates');
      console.log('   - Projects with budget set and active status');
    }
  } catch (e) {
    console.log('   ❌ Scan Error:', e.message);
  }

  console.log('\n✅ Delay Shield test complete!');
}

// Run it
testDelayShield();
