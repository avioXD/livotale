# Dashboard Audit & Fix — Design Spec

**Date:** 2026-06-20  
**Status:** Draft — awaiting review  
**Scope:** All role-wise dashboards in livotale-ui + backing FastAPI endpoints

---

## 1. Problem statement

Dashboard surfaces across roles show KPIs, charts, and tables fed by FastAPI (and some legacy Node) endpoints. Deep research found:

- **API data bugs** — incorrect revenue month, unfiltered enquiry stats, org-global clinical overview for all roles
- **Missing endpoints** — UI calls `/admin/appointments/dashboard` and `/admin/analytics/org/appointments` which exist only in legacy Node, not FastAPI
- **Silent failures** — invalid query params dropped without 400; SQL errors return zeros; UI uses `Promise.allSettled` with no error banners
- **Filter gaps** — backend supports date range, order status, technician/doctor/lab filters; UI only exposes package + payment on admin panel
- **Role UX bugs** — CITY_MANAGER sees duplicate admin + ops panels; technician/doctor see network-wide sample analytics on personal dashboard

---

## 2. Dashboard inventory

### 2.1 Live surfaces

| # | Route | Roles | Primary APIs | Filters today |
|---|-------|-------|--------------|---------------|
| D1 | `/org/:city/dashboard` | SUPER_ADMIN, CITY_MANAGER, OPERATIONS, TECHNICIAN, DOCTOR | `/admin/dashboard/summary`, `/admin/sample-collections/analytics`, role panels | Period (daily/monthly/yearly); package + payment (admin only) |
| D2 | `/org/:city/admin/operations` (overview tab) | OPS roles | `/admin/operations/overview` | None |
| D3 | `/org/:city/admin/staff/:roleSlug` (dashboard section) | OPS roles | `/admin/staff/{slug}/org/dashboard`, sample analytics | Period |
| D4 | `/org/:city/admin/staff/:roleSlug/:memberId` (dashboard tab) | OPS roles | `/dashboard/overview`, role-specific APIs | Period (sample roles) |
| D5 | `/patient` | Patient portal | `/patient-portal/orders`, notifications, downloads | None |

### 2.2 Orphan / dead code (not routed)

| Surface | APIs called | Action |
|---------|-------------|--------|
| `AdminAppointmentsDashboardPage` | `/admin/appointments/dashboard` (Node only) | Wire to FastAPI or remove |
| `AdminAnalyticsPage` | `/admin/analytics/org/appointments` (Node only) | Wire or remove |
| `PatientDashboardPanel` + `useDashboardStore` | `/patient/dashboard/analytics` (Node only) | Wire or remove |

---

## 3. Confirmed API bugs (FastAPI)

### P0 — Wrong data shown

| Bug | Location | Fix |
|-----|----------|-----|
| `revenue.month` equals `revenue.total` | `dashboard_service.py:110` | Compute month-scoped sum on `updated_at` in current calendar month |
| Enquiry KPIs ignore all query filters | `dashboard_service.py:35-38` | Apply `dateFrom`/`dateTo` on `Enquiry.created_at`; optionally status filter |
| Clinical overview is org-global for all roles | `dashboard_service.py:142` | Scope by role: doctor → assigned patients; technician → assigned orders; ops → city if applicable |
| Trend chart returns daily rows with `LIMIT 12` | `dashboard_service.py:183-195` | Aggregate by month before limit, or remove limit and let UI bucket |

### P1 — Validation & errors

| Bug | Fix |
|-----|-----|
| Invalid `dateFrom`/`dateTo`/UUID silently ignored | Return 422 with field errors |
| SQL failures return 0/[] silently on clinical overview | Log error; return 503 or partial with `meta.warnings` |
| `period` not validated on sample analytics | Validate enum; 422 on unknown |
| `lab_partner_id` filter in service but not exposed on route | Add query param to route |

### P2 — Missing FastAPI endpoints (UI expects them)

| UI caller | Legacy path | Proposed FastAPI path |
|-----------|-------------|----------------------|
| `AdminAppointmentsService.getDashboard()` | `/admin/appointments/dashboard` | Port to `/api/v1/admin/appointments/dashboard` using existing ops overview + appointment counts |
| `AdminAppointmentsService.getAnalytics()` | `/admin/analytics/org/appointments` | Port to `/api/v1/admin/analytics/org/appointments` |
| `journeyService` / `useDashboardStore` | `/patient/dashboard/analytics` | Defer unless patient health dashboard is in scope |

---

## 4. UI fixes

### P0 — Error handling (all dashboards)

Add consistent pattern:

```tsx
const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
const [error, setError] = useState<string | null>(null);
// on failure: setState('error'), setError(message)
// render: Alert variant="destructive" + retry button
```

Apply to: `DashboardPage`, `LiverCareDashboardPanel`, `OpsDashboardPanel`, `TechnicianDashboardPanel`, `DoctorLiverCareDashboardPanel`, `PatientDashboardPage`, `AdminOperationsOverviewTab`.

Replace `Promise.allSettled` silent drops in `DashboardPage` with explicit per-request error aggregation.

### P1 — Role layout

| Issue | Fix |
|-------|-----|
| CITY_MANAGER sees both `LiverCareDashboardPanel` AND `OpsDashboardPanel` | Show admin panel only; ops-specific KPIs are subset — merge or hide ops duplicate |
| Technician/doctor see network-wide "Global report" | Restrict `NETWORK_ANALYTICS_ROLES` to SUPER_ADMIN, CITY_MANAGER, OPERATIONS only |

### P2 — Filter alignment (D1 admin panel)

Expose in `LiverCareDashboardPanel`:

- Date range (`dateFrom`, `dateTo`) — date pickers
- Order status — select from `ORDER_STATUS_LABELS`
- Keep existing package + payment filters

Ensure enquiry KPIs update when date filters change (after API fix).

### P3 — Dead code

- Remove or route `AdminAppointmentsDashboardPage` only after FastAPI port
- Delete unused `useDashboardStore` export if patient analytics deferred
- Fix enquiry KPI hrefs: `/admin/enquiries` → `/admin/operations?tab=enquiries`

---

## 5. Feature split (implementation phases)

Each phase is independently deployable and testable.

### Feature 1 — API data correctness (`dashboard_service.py`)
- Fix revenue.month
- Apply date filters to enquiries
- Fix trend chart aggregation
- Contract tests for filter behavior

### Feature 2 — API validation & sample analytics
- 422 on bad params
- Validate `period` enum
- Expose `labPartnerId` on sample analytics route

### Feature 3 — Clinical overview role scoping
- Doctor: scope patient/visit/prescription counts to assigned patients
- Technician: scope to assigned orders (optional — confirm with product)
- Contract tests per role

### Feature 4 — UI error handling (all live dashboards)
- Shared `useAsyncData` hook or `DashboardErrorState` component
- Wire into D1–D5

### Feature 5 — UI filter & role layout (D1)
- Date range + order status filters on admin panel
- Fix CITY_MANAGER duplicate panels
- Restrict global report to ops/admin roles

### Feature 6 — Port missing appointment dashboard APIs
- FastAPI `/admin/appointments/dashboard`
- FastAPI `/admin/analytics/org/appointments`
- Integration tests

### Feature 7 — Staff hub dashboard hardening (D3, D4)
- Verify all role slugs return valid KPIs
- 404 on unknown slug
- Align partner lab stats with ops analytics (fix hardcoded zeros in `StaffService._partner_lab_stats`)

---

## 6. Testing strategy (spec-based)

### Contract tests (FastAPI)

| Test | Endpoint | Assert |
|------|----------|--------|
| `test_dashboard_summary_revenue_month` | GET `/admin/dashboard/summary` | `month <= total`; month changes with date filter |
| `test_dashboard_summary_enquiry_date_filter` | same + `dateFrom`/`dateTo` | enquiry counts scoped |
| `test_dashboard_summary_invalid_date_422` | same + bad date | 422 |
| `test_clinical_overview_doctor_scoped` | GET `/dashboard/overview` as doctor | counts ≤ org totals |
| `test_sample_analytics_period_validation` | GET sample analytics + `period=invalid` | 422 |
| `test_staff_dashboard_unknown_slug_404` | GET staff dashboard + bad slug | 404 |

### UI e2e (Playwright)

| Spec file | Roles | Checks |
|-----------|-------|--------|
| `e2e/dashboard-admin.spec.ts` | SUPER_ADMIN | KPIs load, filters change counts, error banner on 500 mock |
| `e2e/dashboard-ops.spec.ts` | OPERATIONS | Ops panel KPIs, operations hub overview |
| `e2e/dashboard-technician.spec.ts` | TECHNICIAN | Assigned orders panel, no admin APIs 403 |
| `e2e/dashboard-doctor.spec.ts` | DOCTOR | Consultation queue, no duplicate global report |

---

## 7. Out of scope (unless confirmed)

- Patient health analytics dashboard (`PatientDashboardPanel`) — requires new FastAPI patient analytics endpoint
- City-level scoping on ops overview counts — needs city_id on orders/appointments model audit
- Real-time WebSocket dashboard updates — current dashboards are poll-on-load
- Legacy Node route removal — only after FastAPI parity verified

---

## 8. Success criteria

1. All live dashboard routes load without console errors for each role
2. Filter changes produce logically consistent KPI deltas (enquiries + orders respect date range)
3. `revenue.month` ≠ `revenue.total` when historical paid orders exist
4. API returns 422 on malformed filter params (not silent ignore)
5. UI shows error + retry on any failed dashboard API call (no infinite "Loading…")
6. Contract test suite covers all dashboard endpoints with ≥1 happy path + 1 edge case each

---

## 9. Open decisions (need product input)

See clarifying questions in implementation thread.
