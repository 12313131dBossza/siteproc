-- Aggregated dashboard stats view
begin;
create or replace view public.dashboard_stats as
select
  (select count(*) from public.jobs j where j.company_id = public.demo_company_id()) as active_projects,
  (select count(*) from public.quotes q where q.company_id = public.demo_company_id() and q.status='submitted') as pending_bids,
  (select count(*) from public.deliveries d where d.company_id = public.demo_company_id() and d.status <> 'delivered') as open_deliveries,
  (select count(*) from public.pos p where p.company_id = public.demo_company_id() and p.status <> 'complete') as unpaid_invoices;
commit;
