// Debug script to test expenses functionality
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE

console.log('Environment check:')
console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
console.log('SERVICE_KEY:', supabaseServiceKey ? 'Set' : 'Missing')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugExpenses() {
  try {
    console.log('\n=== DEBUGGING EXPENSES ===')
    
    // 1. Check if expenses table exists
    console.log('\n1. Checking expenses table structure...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('expenses')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.error('Expenses table error:', tableError)
      return
    }
    
    console.log('✅ Expenses table accessible')
    
    // 2. Check projects table
    console.log('\n2. Checking projects table...')
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, company_id')
      .limit(5)
    
    if (projectsError) {
      console.error('Projects table error:', projectsError)
    } else {
      console.log('✅ Projects found:', projects.length)
      if (projects.length > 0) {
        console.log('Sample project:', projects[0])
      }
    }
    
    // 3. Check profiles table
    console.log('\n3. Checking profiles table...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, company_id')
      .limit(5)
    
    if (profilesError) {
      console.error('Profiles table error:', profilesError)
    } else {
      console.log('✅ Profiles found:', profiles.length)
      if (profiles.length > 0) {
        console.log('Sample profile:', profiles[0])
      }
    }
    
    // 4. Check existing expenses
    console.log('\n4. Checking existing expenses...')
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('id, amount, description, status, created_at')
      .limit(5)
    
    if (expensesError) {
      console.error('Expenses query error:', expensesError)
    } else {
      console.log('✅ Existing expenses:', expenses.length)
      expenses.forEach(expense => {
        console.log(`- ${expense.id}: $${expense.amount} - ${expense.description} (${expense.status})`)
      })
    }
    
    // 5. Test creating a simple expense
    if (projects.length > 0 && profiles.length > 0) {
      console.log('\n5. Testing expense creation...')
      const testExpense = {
        project_id: projects[0].id,
        amount: 10.99,
        description: 'Test expense from debug script',
        category: 'testing',
        status: 'pending',
        submitted_by: profiles[0].id,
        submitted_at: new Date().toISOString()
      }
      
      const { data: newExpense, error: createError } = await supabase
        .from('expenses')
        .insert(testExpense)
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Failed to create test expense:', createError)
      } else {
        console.log('✅ Test expense created:', newExpense.id)
        
        // Clean up - delete the test expense
        const { error: deleteError } = await supabase
          .from('expenses')
          .delete()
          .eq('id', newExpense.id)
        
        if (deleteError) {
          console.log('⚠️  Failed to delete test expense:', deleteError)
        } else {
          console.log('✅ Test expense cleaned up')
        }
      }
    }
    
  } catch (error) {
    console.error('Debug script error:', error)
  }
}

debugExpenses()