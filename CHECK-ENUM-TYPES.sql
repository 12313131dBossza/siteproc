-- Check enum types and their values
select 
  t.typname as enum_name,
  e.enumlabel as enum_value
from pg_type t 
join pg_enum e on t.oid = e.enumtypid
join pg_catalog.pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
  and t.typname like '%status%'
order by t.typname, e.enumsortorder;
