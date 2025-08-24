-- Seed a few demo expense rows (id auto-generated)
-- Assumes at least one company, job exists; adjust UUIDs below to valid ones in your project.
-- Replace the placeholder UUIDs before running if needed.

-- You can fetch real IDs:
-- select id from public.companies limit 1; -- use value for :company_id
-- select id from public.jobs where company_id=:company_id limit 1; -- for :job_id

-- BEGIN seed
begin;
with base as (
  select 
    (select id from public.companies limit 1) as company_id,
    (select id from public.jobs limit 1) as job_id
)
insert into public.expenses (company_id, job_id, amount, spent_at, memo, category, vendor, tax, description, status)
select company_id, job_id, 1250.00, current_date - interval '2 days', 'Concrete additive', 'Materials', 'BuildSupply Co', 50.00, 'Concrete additive for slab pour', 'logged' from base
union all
select company_id, job_id, 480.75, current_date - interval '1 day', 'Excavator rental', 'Equipment', 'HeavyRent LLC', 0.00, '1-day excavator rental', 'logged' from base
union all
select company_id, job_id, 89.99, current_date, 'Team lunch', 'Meals', 'City Deli', 7.20, 'Crew lunch meeting', 'logged' from base;
commit;
-- END seed

-- Rollback seed (removes rows inserted today & last 2 days with these vendors/categories)
-- begin;
-- delete from public.expenses 
--   where vendor in ('BuildSupply Co','HeavyRent LLC','City Deli')
--     and spent_at >= current_date - interval '3 days';
-- commit;
