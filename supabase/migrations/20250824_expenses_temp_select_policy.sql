-- Temporary open SELECT policy for demo (REMOVE BEFORE PRODUCTION)
begin;
create policy if not exists expenses_read_test on public.expenses for select using (true);
commit;

-- Rollback
-- begin;
-- drop policy if exists expenses_read_test on public.expenses;
-- commit;
