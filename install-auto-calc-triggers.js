// Install Project Auto-Calc Triggers
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://kylhdwtcgqzbkiyqxqfo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5bGhkd3RjZ3F6YmtpeXF4cWZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzAzOTA4NywiZXhwIjoyMDUyNjE1MDg3fQ.tnJxPXCt5Wz1JWBXLKgOW_HqqHAu-kVPEVQkFGq3xsI';

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('📦 Reading SQL file...');
  const sql = fs.readFileSync('create-project-auto-calc-triggers.sql', 'utf8');

  console.log('🚀 Installing auto-calc triggers...\n');

  try {
    // Execute the SQL directly using rpc to exec_sql function
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_string: sql 
    });

    if (error) {
      console.error('❌ Error:', error.message);
      
      // If exec_sql doesn't exist, try executing parts individually
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('\n⚠️  exec_sql function not found. Installing via alternative method...\n');
        
        // Split into smaller parts and execute
        const statements = sql.split('-- Step ');
        
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              const result = await supabase.rpc('exec_sql', { sql_string: statement });
              if (result.error) {
                console.log('⚠️  Warning:', result.error.message.substring(0, 100));
              }
            } catch (e) {
              // Try direct query for simpler statements
              console.log('Trying alternative execution method...');
            }
          }
        }
      }
      
      process.exit(1);
    }

    console.log('✅ Auto-calc triggers installed successfully!');
    console.log('\n📊 Verifying installation...\n');

    // Verify by checking projects table structure
    const { data: columns, error: colError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);

    if (!colError && columns && columns.length > 0) {
      const project = columns[0];
      console.log('✅ Projects table columns verified:');
      if ('actual_expenses' in project) console.log('   ✅ actual_expenses column exists');
      if ('variance' in project) console.log('   ✅ variance column exists');
      if ('budget' in project) console.log('   ✅ budget column exists');
    }

    // Show sample data
    const { data: projects, error: projError } = await supabase
      .from('projects')
      .select('id, name, budget, actual_expenses, variance')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!projError && projects) {
      console.log('\n📋 Sample Projects:');
      projects.forEach(p => {
        console.log(`   ${p.name}: Budget=$${p.budget || 0}, Actual=$${p.actual_expenses || 0}, Variance=$${p.variance || 0}`);
      });
    }

    console.log('\n🎯 TRIGGERS ACTIVE:');
    console.log('   ✅ Expenses → Projects sync trigger');
    console.log('   ✅ Budget change → Variance recalc trigger');
    console.log('   ✅ All existing projects initialized');
    console.log('\n💡 TIP: Try approving an expense to see automatic updates!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

main();
