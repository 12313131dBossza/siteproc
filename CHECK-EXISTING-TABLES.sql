-- Check which tables exist in your database
select table_name 
from information_schema.tables 
where table_schema = 'public' 
  and table_type = 'BASE TABLE'
  and table_name in (
    'projects',
    'payments', 
    'products',
    'contractors',
    'clients',
    'orders',
    'deliveries',
    'expenses',
    'change_orders'
  )
order by table_name;
