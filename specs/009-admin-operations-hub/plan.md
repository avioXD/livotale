# Implementation Plan: Admin Operations Hub

## Phase 1 — Spec & navigation

- [x] spec.md, contracts, tasks
- Consolidate sidebar: `Operations` → `/admin/operations`
- Redirects: `/admin/appointments`, `/admin/sample-collections`, `/admin/appointments/missed`, `/admin/appointments/routes`

## Phase 2 — Operations Hub UI

- `AdminOperationsHubPage` with URL tab state (`?tab=overview|appointments|samples|orders`)
- `AdminOperationsAppointmentsTab` — DataTable, filters (status includes missed/no_show), RouteMonitoringPanel
- `AdminOperationsSamplesTab` — DataTable, filters, detail drawer
- `AdminOperationsOrdersTab` — orders table + AdminCollectPaymentModal
- `AdminOperationsOverviewTab` — KPI cards + quick actions

## Phase 3 — Payments API & demo gateway

- `adminOperationsService.js` — list orders, collect payment, patient demo pay
- `AdminOperationsService.ts` + demo fallback
- `DemoPaymentGateway` component for patient `PaymentStep`
- `seed-operations-demo.js` — varied appointment/sample/payment states

## File map

```
livotale-ui/src/app/pages/admin/operations/
  AdminOperationsHubPage.tsx
  adminOperationsConfig.ts
  components/
    AdminOperationsOverviewTab.tsx
    AdminOperationsAppointmentsTab.tsx
    AdminOperationsSamplesTab.tsx
    AdminOperationsOrdersTab.tsx
    RouteMonitoringPanel.tsx
    DemoPaymentGatewayModal.tsx
    AdminCollectPaymentModal.tsx

livotale_app/api/src/
  services/adminOperationsService.js
  routes/adminOperations.js
  scripts/seed-operations-demo.js
```
