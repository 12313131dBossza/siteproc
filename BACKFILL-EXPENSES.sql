-- BACKFILL-EXPENSES.sql
-- Purpose: Backfill existing expenses rows to match normalized schema expectations.

begin;

-- 1) If company_id is null, infer from profiles via user_id
update public.expenses e
set company_id = p.company_id
from public.profiles p
where e.company_id is null and e.user_id = p.id;

-- 2) Default status to 'pending' when null
update public.expenses set status = 'pending' where status is null;

-- 3) If approved_* missing but decided_* present, copy them
update public.expenses set approved_by = decided_by where approved_by is null and decided_by is not null;
update public.expenses set approved_at = decided_at where approved_at is null and decided_at is not null;

-- 4) Ensure spent_at populated if spent_on present (or vice versa)
update public.expenses set spent_at = spent_on where spent_at is null and spent_on is not null;
update public.expenses set spent_on = spent_at where spent_on is null and spent_at is not null;

commit;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
