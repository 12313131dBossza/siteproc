-- Check actual columns in each table
select 'projects' as table_name, column_name, data_type 
from information_schema.columns 
where table_schema = 'public' and table_name = 'projects'
union all
select 'products' as table_name, column_name, data_type 
from information_schema.columns 
where table_schema = 'public' and table_name = 'products'
union all
select 'change_orders' as table_name, column_name, data_type 
from information_schema.columns 
where table_schema = 'public' and table_name = 'change_orders'
order by table_name, column_name;
