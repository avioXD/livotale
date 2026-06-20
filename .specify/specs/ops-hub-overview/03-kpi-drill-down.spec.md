# Ops Hub Overview — KPI Drill-Down

**Status**: Implemented  
**Component**: `AdminOperationsOverviewTab`

## KPI targets

| KPI | href |
|-----|------|
| Today's appointments | `?tab=appointments` |
| Pending assignments | `?tab=orders&assignedTo=unassigned` |
| Missed / no-show today | `/admin/appointments/missed` |
| Samples awaiting assign | `?tab=partner-lab&status=not_started` |
| Unpaid orders | `?tab=orders&paymentStatus=unpaid` |
| Collected today | `?tab=orders&paymentStatus=success` |

## UX

- `KpiCard` receives `href` (same pattern as `OpsDashboardPanel`).
- Hint text matches actual destination.

## Verification

- Each KPI card is a link with correct `to` path.
- E2E click-through for at least orders and lab KPIs.
