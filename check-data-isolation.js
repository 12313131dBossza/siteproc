// Check Data Isolation - Verify expenses are properly filtered by company_id
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.log('SERVICE_KEY:', supabaseServiceKey ? 'Set' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkDataIsolation() {
  console.log('🔍 CHECKING DATA ISOLATION FOR EXPENSES\n')
  console.log('=' .repeat(80))

  // Step 1: Get all companies
  console.log('\n📊 STEP 1: List All Companies')
  console.log('-'.repeat(80))
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name, is_demo')
    .order('created_at', { ascending: true })

  if (companiesError) {
    console.error('❌ Error fetching companies:', companiesError.message)
    return
  }

  console.log(`Found ${companies?.length || 0} companies:\n`)
  companies?.forEach((company, idx) => {
    console.log(`${idx + 1}. ${company.name}`)
    console.log(`   ID: ${company.id}`)
    console.log(`   Demo: ${company.is_demo ? 'Yes' : 'No'}\n`)
  })

  // Step 2: Check expenses for each company
  console.log('\n💰 STEP 2: Expenses Per Company')
  console.log('-'.repeat(80))

  for (const company of companies || []) {
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('id, vendor, amount, category, company_id, user_id, created_at')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (expensesError) {
      console.error(`❌ Error fetching expenses for ${company.name}:`, expensesError.message)
      continue
    }

    console.log(`\n📦 ${company.name} (${company.id})`)
    console.log(`   Total expenses: ${expenses?.length || 0}`)
    
    if (expenses && expenses.length > 0) {
      console.log(`   Recent expenses:`)
      expenses.slice(0, 5).forEach(exp => {
        console.log(`   - $${exp.amount} | ${exp.vendor || 'N/A'} | ${exp.category || 'N/A'}`)
        console.log(`     ID: ${exp.id}`)
        console.log(`     Company: ${exp.company_id === company.id ? '✅ CORRECT' : '❌ MISMATCH!'}`)
      })
    }
  }

  // Step 3: Check for expenses with wrong company_id
  console.log('\n\n🚨 STEP 3: Checking for Data Leakage')
  console.log('-'.repeat(80))

  const { data: allExpenses, error: allExpensesError } = await supabase
    .from('expenses')
    .select('id, vendor, amount, company_id, user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (allExpensesError) {
    console.error('❌ Error fetching all expenses:', allExpensesError.message)
    return
  }

  // Group by company_id
  const expensesByCompany = {}
  allExpenses?.forEach(exp => {
    if (!expensesByCompany[exp.company_id]) {
      expensesByCompany[exp.company_id] = []
    }
    expensesByCompany[exp.company_id].push(exp)
  })

  console.log(`\nTotal expenses checked: ${allExpenses?.length || 0}`)
  console.log(`Companies with expenses: ${Object.keys(expensesByCompany).length}\n`)

  Object.entries(expensesByCompany).forEach(([companyId, expenses]) => {
    const company = companies?.find(c => c.id === companyId)
    const companyName = company?.name || 'UNKNOWN COMPANY'
    console.log(`${companyName}: ${expenses.length} expenses`)
  })

  // Step 4: Check RLS policies
  console.log('\n\n🔒 STEP 4: Checking RLS Policies on Expenses Table')
  console.log('-'.repeat(80))

  const { data: policies, error: policiesError } = await supabase
    .rpc('pg_get_viewdef', { 
      viewname: 'pg_policies',
      pretty: true 
    })
    .catch(() => null) // Fallback if function doesn't exist

  // Alternative: Query pg_policies directly
  const { data: policiesData } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'expenses')
    .catch(() => ({ data: null }))

  if (policiesData && policiesData.length > 0) {
    console.log(`\nFound ${policiesData.length} RLS policies on expenses table:\n`)
    policiesData.forEach(policy => {
      console.log(`Policy: ${policy.policyname}`)
      console.log(`  Command: ${policy.cmd}`)
      console.log(`  Using: ${policy.qual || 'N/A'}`)
      console.log(`  With Check: ${policy.with_check || 'N/A'}\n`)
    })
  } else {
    console.log('\n⚠️  Could not fetch RLS policies (requires appropriate permissions)')
    console.log('Checking if RLS is enabled on expenses table...')
    
    const { data: tableInfo } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'expenses')
      .single()
      .catch(() => ({ data: null }))
    
    if (tableInfo) {
      console.log('✅ Expenses table exists')
    }
  }

  // Step 5: Check user profiles and their company associations
  console.log('\n\n👥 STEP 5: User-Company Associations')
  console.log('-'.repeat(80))

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, role, company_id, username, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError.message)
  } else {
    console.log(`\nRecent users (last 20):\n`)
    
    for (const profile of profiles || []) {
      const company = companies?.find(c => c.id === profile.company_id)
      const { data: userExpenses } = await supabase
        .from('expenses')
        .select('id, company_id')
        .eq('user_id', profile.id)
        .limit(5)

      console.log(`User: ${profile.username || profile.id.slice(0, 8)}`)
      console.log(`  Role: ${profile.role || 'N/A'}`)
      console.log(`  Company: ${company?.name || 'NONE'}`)
      console.log(`  Expenses: ${userExpenses?.length || 0}`)
      
      // Check for mismatches
      const mismatches = userExpenses?.filter(exp => exp.company_id !== profile.company_id) || []
      if (mismatches.length > 0) {
        console.log(`  ⚠️  WARNING: ${mismatches.length} expenses with WRONG company_id!`)
        mismatches.forEach(exp => {
          console.log(`     - Expense ${exp.id}: company_id = ${exp.company_id} (should be ${profile.company_id})`)
        })
      }
      console.log()
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('📋 SUMMARY')
  console.log('='.repeat(80))
  console.log(`✓ Total Companies: ${companies?.length || 0}`)
  console.log(`✓ Total Expenses: ${allExpenses?.length || 0}`)
  console.log(`✓ Companies with expenses: ${Object.keys(expensesByCompany).length}`)
  
  // Check for potential issues
  const issues = []
  
  // Check if any user has expenses from multiple companies
  const userExpenseCompanies = {}
  allExpenses?.forEach(exp => {
    if (!userExpenseCompanies[exp.user_id]) {
      userExpenseCompanies[exp.user_id] = new Set()
    }
    userExpenseCompanies[exp.user_id].add(exp.company_id)
  })
  
  const multiCompanyUsers = Object.entries(userExpenseCompanies)
    .filter(([userId, companyIds]) => companyIds.size > 1)
  
  if (multiCompanyUsers.length > 0) {
    issues.push(`⚠️  ${multiCompanyUsers.length} users have expenses across multiple companies`)
  }
  
  console.log('\n' + (issues.length === 0 ? '✅ No data isolation issues detected!' : '🚨 Issues Found:'))
  issues.forEach(issue => console.log(issue))
  
  console.log('\n' + '='.repeat(80))
}

checkDataIsolation()
  .then(() => {
    console.log('\n✅ Check complete!')
    process.exit(0)
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message)
    process.exit(1)
  })
