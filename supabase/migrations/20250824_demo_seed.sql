-- Seed demo data for SiteProc Demo company
begin;
with demo as (select public.demo_company_id() as cid)
-- Jobs
insert into public.jobs (company_id, name, code)
select cid, 'Warehouse Expansion','WH-001' from demo
on conflict do nothing;
insert into public.jobs (company_id, name, code)
select cid, 'Office Renovation','OF-002' from demo
on conflict do nothing;

-- Suppliers
insert into public.suppliers (company_id, name, email, phone)
select cid, 'BuildSupply Co','supply@example.com','555-1000' from demo
on conflict do nothing;
insert into public.suppliers (company_id, name, email, phone)
select cid, 'HeavyRent LLC','rent@example.com','555-2000' from demo
on conflict do nothing;

-- Change Order
insert into public.change_orders (company_id, job_id, description, cost_delta, status)
select d.cid, j.id, 'Add security cameras', 4500,'pending'
from demo d join public.jobs j on j.company_id=d.cid and j.code='WH-001'
on conflict do nothing;

-- POs
insert into public.pos (company_id, job_id, po_number, total, status)
select d.cid, j.id, 'PO-000001', 12345.67, 'issued'
from demo d join public.jobs j on j.company_id=d.cid and j.code='WH-001'
on conflict do nothing;

-- Deliveries
insert into public.deliveries (company_id, job_id, status)
select d.cid, j.id, 'pending' from demo d join public.jobs j on j.company_id=d.cid and j.code='WH-001'
returning id into strict nothing;
insert into public.deliveries (company_id, job_id, status)
select d.cid, j.id, 'partial' from demo d join public.jobs j on j.company_id=d.cid and j.code='OF-002'
returning id into strict nothing;

-- Expenses (ensure extended columns exist first)
insert into public.expenses (company_id, job_id, amount, spent_at, category, vendor, tax, description, status)
select d.cid, j.id, 1250.00, current_date - 2, 'Materials','BuildSupply Co',50,'Concrete additive','logged'
from demo d join public.jobs j on j.company_id=d.cid and j.code='WH-001';
insert into public.expenses (company_id, job_id, amount, spent_at, category, vendor, tax, description, status)
select d.cid, j.id, 480.75, current_date - 1, 'Equipment','HeavyRent LLC',0,'Excavator rental','logged'
from demo d join public.jobs j on j.company_id=d.cid and j.code='WH-001';
insert into public.expenses (company_id, job_id, amount, spent_at, category, vendor, tax, description, status)
select d.cid, j.id, 89.99, current_date, 'Meals','City Deli',7.2,'Crew lunch meeting','logged'
from demo d join public.jobs j on j.company_id=d.cid and j.code='OF-002';

-- Events (recent activity)
insert into public.events (company_id, entity, entity_id, verb)
select d.cid, 'expense', e.id, 'added' from demo d join public.expenses e on e.company_id=d.cid limit 1;
insert into public.events (company_id, entity, entity_id, verb)
select d.cid, 'change_order', co.id, 'submitted' from demo d join public.change_orders co on co.company_id=d.cid limit 1;
insert into public.events (company_id, entity, entity_id, verb)
select d.cid, 'delivery', del.id, 'checked_in' from demo d join public.deliveries del on del.company_id=d.cid limit 1;
commit;
