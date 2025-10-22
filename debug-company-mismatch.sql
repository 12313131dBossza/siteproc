-- Check what's in companies table
select * from public.companies;

-- Check if your profile has the right company_id
select id, email, company_id, role 
from public.profiles 
where id = '12bba0f7-32fd-4784-a4ae-4f6defcd77e8';

-- See what company_id is actually in projects
select distinct company_id from public.projects;
