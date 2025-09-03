-- Diagnostic script to check current database state
-- Run this in Supabase SQL Editor to see what's missing

-- 1. Check if tables exist
select 
  table_name,
  case when table_name is not null then '✅ EXISTS' else '❌ MISSING' end as status
from information_schema.tables 
where table_schema = 'public' 
and table_name in ('profiles', 'companies', 'products', 'suppliers', 'orders')
order by table_name;

-- 2. Check current RLS policies on profiles
select 
  policyname,
  permissive,
  cmd,
  qual,
  with_check
from pg_policies 
where tablename = 'profiles' 
and schemaname = 'public';

-- 3. Check if auth_company_id function exists and its definition
select 
  routine_name,
  routine_definition
from information_schema.routines 
where routine_schema = 'public' 
and routine_name = 'auth_company_id';

-- 4. Count records in key tables (if they exist)
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'profiles' and table_schema = 'public') then
    raise notice 'Profiles count: %', (select count(*) from public.profiles);
  end if;
  
  if exists (select 1 from information_schema.tables where table_name = 'products' and table_schema = 'public') then
    raise notice 'Products count: %', (select count(*) from public.products);
  end if;
  
  if exists (select 1 from information_schema.tables where table_name = 'suppliers' and table_schema = 'public') then
    raise notice 'Suppliers count: %', (select count(*) from public.suppliers);
  end if;
end $$;
