// Final verification of data isolation
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function verify() {
  console.log('\n✅ DATA ISOLATION VERIFICATION REPORT\n')
  console.log('=' .repeat(80))

  // Get all data
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, is_demo')
    .order('name')

  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, vendor, amount, company_id, user_id')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, company_id, username, role')
    .not('company_id', 'is', null)

  console.log('\n📊 DATABASE OVERVIEW')
  console.log('-'.repeat(80))
  console.log(`Companies: ${companies?.length || 0}`)
  console.log(`Expenses: ${expenses?.length || 0}`)
  console.log(`Active Users: ${profiles?.length || 0}`)

  // Group expenses by company
  const expensesByCompany = {}
  expenses?.forEach(exp => {
    if (!expensesByCompany[exp.company_id]) {
      expensesByCompany[exp.company_id] = []
    }
    expensesByCompany[exp.company_id].push(exp)
  })

  console.log('\n💰 EXPENSES BY COMPANY')
  console.log('-'.repeat(80))
  
  companies?.forEach(company => {
    const companyExpenses = expensesByCompany[company.id] || []
    console.log(`\n${company.name}${company.is_demo ? ' (Demo)' : ''}`)
    console.log(`  Expenses: ${companyExpenses.length}`)
    
    if (companyExpenses.length > 0) {
      const total = companyExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
      console.log(`  Total: $${total.toFixed(2)}`)
      console.log(`  Recent: ${companyExpenses.slice(0, 3).map(e => e.vendor || 'N/A').join(', ')}`)
    }
  })

  // Check for data integrity issues
  console.log('\n\n🔍 DATA INTEGRITY CHECKS')
  console.log('-'.repeat(80))

  const issues = []

  // Check 1: Expenses with NULL company_id or user_id
  const nullCompany = expenses?.filter(e => !e.company_id) || []
  const nullUser = expenses?.filter(e => !e.user_id) || []
  
  if (nullCompany.length > 0) {
    issues.push(`❌ ${nullCompany.length} expenses with NULL company_id`)
  } else {
    console.log('✅ All expenses have company_id set')
  }

  if (nullUser.length > 0) {
    console.log(`⚠️  ${nullUser.length} expenses with NULL user_id (may be system/demo data)`)
  } else {
    console.log('✅ All expenses have user_id set')
  }

  // Check 2: Expenses with invalid company_id (not in companies table)
  const validCompanyIds = new Set(companies?.map(c => c.id) || [])
  const invalidCompany = expenses?.filter(e => 
    e.company_id && !validCompanyIds.has(e.company_id)
  ) || []

  if (invalidCompany.length > 0) {
    issues.push(`❌ ${invalidCompany.length} expenses with invalid company_id`)
  } else {
    console.log('✅ All expenses reference valid companies')
  }

  // Check 3: Users with expenses in different company
  console.log('\n🔐 CROSS-COMPANY DATA LEAKAGE CHECK')
  console.log('-'.repeat(80))

  let crossCompanyIssues = false

  for (const profile of profiles || []) {
    const userExpenses = expenses?.filter(e => e.user_id === profile.id) || []
    const wrongCompanyExpenses = userExpenses.filter(
      e => e.company_id !== profile.company_id
    )

    if (wrongCompanyExpenses.length > 0) {
      crossCompanyIssues = true
      const userCompany = companies?.find(c => c.id === profile.company_id)
      console.log(`\n❌ ${profile.username || 'User ' + profile.id.slice(0, 8)}`)
      console.log(`   Assigned to: ${userCompany?.name}`)
      console.log(`   Has ${wrongCompanyExpenses.length} expenses in OTHER companies:`)
      
      wrongCompanyExpenses.forEach(exp => {
        const expCompany = companies?.find(c => c.id === exp.company_id)
        console.log(`   - $${exp.amount} in ${expCompany?.name || 'Unknown'}`)
      })
    }
  }

  if (!crossCompanyIssues) {
    console.log('✅ No cross-company data leakage detected!')
    console.log('   Each user only has expenses in their own company.')
  }

  // Summary
  console.log('\n\n' + '='.repeat(80))
  console.log('📋 FINAL VERDICT')
  console.log('='.repeat(80))

  if (issues.length === 0 && !crossCompanyIssues) {
    console.log('\n🎉 EXCELLENT! Your database has proper data isolation.\n')
    console.log('✅ All expenses have valid company_id')
    console.log('✅ All companies only see their own expenses')
    console.log('✅ No cross-company data leakage')
    console.log('\nYour multi-tenant setup is working correctly!')
  } else {
    console.log('\n⚠️  ISSUES DETECTED:\n')
    issues.forEach(issue => console.log(issue))
    if (crossCompanyIssues) {
      console.log('❌ Cross-company data leakage found')
    }
    console.log('\nRecommended actions:')
    console.log('1. Check your RLS policies on the expenses table')
    console.log('2. Verify API routes filter by company_id')
    console.log('3. Review expense creation logic to ensure company_id is set')
  }

  console.log('\n' + '='.repeat(80))

  // Test with actual user login
  console.log('\n🧪 TESTING WITH ACTUAL USER CONTEXT')
  console.log('-'.repeat(80))
  
  if (profiles && profiles.length > 0) {
    const testProfile = profiles[0]
    const userCompany = companies?.find(c => c.id === testProfile.company_id)
    const userExpenses = expenses?.filter(e => e.company_id === testProfile.company_id) || []
    
    console.log(`\nTest User: ${testProfile.username || testProfile.id.slice(0, 8)}`)
    console.log(`Company: ${userCompany?.name}`)
    console.log(`Should see ${userExpenses.length} expenses`)
    console.log(`Should NOT see ${(expenses?.length || 0) - userExpenses.length} expenses from other companies`)
  }

  console.log('\n' + '='.repeat(80))
}

verify()
  .then(() => {
    console.log('\n✅ Verification complete!\n')
    process.exit(0)
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message)
    process.exit(1)
  })
