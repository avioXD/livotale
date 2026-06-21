# Spec: Admin Dashboard & Analytics

**Route**: `/dashboard` (Administration role)  
**Extends**: existing `DashboardPage` + `009` overview KPIs

## KPI cards

- Total enquiries / new / converted
- Total patients
- Total orders
- Payment pending / completed
- Technician assigned / scan completed
- Lab report pending
- Final report pending
- Doctor consultation pending
- Prescription pending
- Revenue (today / month / range)
- Package-wise sales count

## Charts

- Enquiries funnel (new → converted)
- Orders by status
- Package mix pie
- Revenue trend
- Technician performance (scans completed)
- Partner lab usage
- Doctor consultation count

## Filters

`date_from`, `date_to`, `package_id`, `order_status`, `technician_id`, `doctor_id`, `partner_lab_id`, `payment_status`

## API

`GET /admin/dashboard/summary?filters...`

## UI

Replace current admin-only `SampleAnalyticsPanel`-only view with full KPI grid + drill-down links to filtered Operations hub tabs.

## Mock

`dashboard.mock.ts` — seed realistic numbers tied to sample orders in `seed-liver-care-platform.js`.
