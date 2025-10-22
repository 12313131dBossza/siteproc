-- Check actual columns in change_orders table
select column_name, data_type 
from information_schema.columns 
where table_schema = 'public' 
  and table_name = 'change_orders'
order by ordinal_position;
