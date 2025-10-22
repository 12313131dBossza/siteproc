-- Force refresh Supabase PostgREST schema cache
-- Run this after any schema changes

notify pgrst, 'reload schema';

-- Verify the expenses columns are visible
select column_name, data_type 
from information_schema.columns 
where table_schema = 'public' 
  and table_name = 'expenses'
order by ordinal_position;
