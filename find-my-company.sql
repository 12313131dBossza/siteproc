-- Find your actual company_id from your profile
select 
  id as profile_id,
  company_id,
  role,
  email
from public.profiles
where id = '12bba0f7-32fd-4784-a4ae-4f6defcd77e8';

-- Also list all companies
select id, name from public.companies;

-- And list all projects to use for job_id
select id, name, company_id from public.projects limit 5;
