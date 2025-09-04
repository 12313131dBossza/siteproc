// Run expense workflow migration
// Run this with: node run-migration.js

const { createClient } = require('@supabase/supabase-js');

async function runMigration() {
  // Use service role key for admin access
  const supabase = createClient(
    'https://ljhjstnzxnktnkpmtwxl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqaGpzdG56eG5rdG5rcG10d3hsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDMwNDQ5MSwiZXhwIjoyMDQ5ODgwNDkxfQ.rIjcDOPLROD8dIhNg1Qj4CZFVvT6FMmOqKv0SxHzAzE'
  );

  console.log('🔍 Running expense workflow migration...');
  
  const migrationSQL = `
    -- Add workflow columns to expenses table
    ALTER TABLE public.expenses 
      ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
      ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
      ADD COLUMN IF NOT EXISTS approved_at timestamptz,
      ADD COLUMN IF NOT EXISTS approval_notes text,
      ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

    -- Add indexes for performance
    CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON public.expenses(user_id);
    CREATE INDEX IF NOT EXISTS expenses_status_idx ON public.expenses(status);
    CREATE INDEX IF NOT EXISTS expenses_company_status_idx ON public.expenses(company_id, status);

    -- Update existing records to have approved status
    UPDATE public.expenses 
    SET 
      status = 'approved',
      updated_at = now()
    WHERE status IS NULL;
  `;

  try {
    console.log('Executing SQL migration...');
    const { data, error } = await supabase.rpc('exec', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      return;
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Test the new schema
    console.log('\n🔍 Testing new schema...');
    const { data: expenses, error: testError } = await supabase
      .from('expenses')
      .select('*')
      .limit(1);
      
    if (testError) {
      console.error('❌ Schema test failed:', testError);
    } else {
      console.log('✅ Schema test successful. Sample expense:', expenses?.[0]);
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

runMigration().then(() => {
  console.log('Migration script completed.');
  process.exit(0);
}).catch(error => {
  console.error('Migration script failed:', error);
  process.exit(1);
});
