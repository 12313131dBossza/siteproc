-- BACKFILL-CLIENTS.sql

begin;

update public.clients c set created_by = (select pr.id from public.profiles pr where pr.company_id = c.company_id and pr.role in ('admin','owner') limit 1) where c.created_by is null and c.company_id is not null;
update public.clients set status = 'active' where status is null or status = '';
update public.clients set updated_at = created_at where updated_at is null;

commit;
notify pgrst, 'reload schema';
