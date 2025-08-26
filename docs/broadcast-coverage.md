# Broadcast Coverage

This document tracks mutation endpoints that trigger realtime dashboard or entity-specific invalidations.

Legend:
- [x] dashboard broadcast (broadcastDashboardUpdated)
- [~] partial / indirect (e.g. only job channel)
- [ ] missing (follow-up)

## Expenses
- POST /api/expenses — [x] dashboard + expense + job

## Deliveries
- POST /api/deliveries — [x] dashboard + delivery + job

## Cost Codes
- POST /api/cost-codes — [~] job (no dashboard impact currently)

## Change Orders
- POST /api/change-orders — [x] dashboard (creation)
- POST /api/change-orders/public/:token/approve — [x] dashboard + job change order
- POST /api/change-orders/public/:token/reject — [x] dashboard + job change order

## RFQs
- POST /api/rfqs — [x] dashboard
- POST /api/rfqs/:id/send — [x] dashboard
- POST /api/rfqs/:id/resend — [x] dashboard

## Quotes / Bids
- POST /api/quotes/:id/select — [x] dashboard + job PO + PO

## POs
- POST /api/po (creation via quote selection) — [x] dashboard
- POST /api/po/:id/complete — [x] dashboard + po
- POST /api/po/:id/void — [x] dashboard + po
- POST /api/po/:id/resend — [x] dashboard + po
- POST /api/po/:id/pdf — [x] dashboard + po
- POST /api/po/:id/ping — [x] dashboard + po

## Suppliers
- POST /api/suppliers — [x] dashboard

## Jobs
- POST /api/jobs — [x] dashboard (creation)

## Clients (stub)
- POST /api/clients — [ ] (stub; schema pending)

## Payments (stub)
- POST /api/payments — [ ] (stub; schema pending)

## Notes
- New channel naming migration in progress: subscribing to both legacy `table-company-{id}` and new `table:{name}:company:{id}` patterns.
- Dashboard channel now dual-emits legacy `dashboard:company-{id}` and new `dashboard:company:{id}` during migration.

## TODO
- (Done) Add jobs creation endpoint with broadcast if KPI depends on activeProjects.
- Add clients/payments schema + broadcasts when finalized.
- Remove legacy channel subscriptions after migration period.
