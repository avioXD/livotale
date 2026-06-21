# F02 — Admin Dashboard & Operations Hub Recovery

**Priority**: P0  
**Gaps**: G-02, G-03, G-10, G-12, G-14

---

## Features in scope

| Tab / page | UI path | APIs |
|------------|---------|------|
| Dashboard home | `/org/:city/dashboard` | summary, analytics, role panels |
| Ops hub overview | `/admin/operations` | operations/overview, appointments/dashboard |
| Enquiries | ops hub | `/admin/enquiries/*` |
| Orders | ops hub | `/admin/orders/*` |
| Partner lab / AI | ops hub | pathology queues |
| Audit log | `/admin/audit` | **404 — path mismatch** |
| Service zones | `/admin/service-zones` | CRUD ✅ |

---

## P0 fixes

### 1. Dashboard summary (G-02)

- **Apply** `034_enquiry_crm_order_extensions.sql`
- **Verify** query in `admin_dashboard_service.py` uses `order_outcome` only after migration
- **Test**: GET `/admin/dashboard/summary` → 200

### 2. Lab partners roster (G-12)

- **Problem**: `GET /admin/staff/lab-partners/roster` hits `{lab_id}` route
- **Fix**: Register static `/staff/lab-partners/roster` **before** `/staff/lab-partners/{lab_id}` in router include order, or rename roster path to `/staff/lab-partners-roster`
- **Test**: GET roster → 200, not 422

### 3. Admin audit (G-10)

**UI calls**: `GET /admin/audit?entity_type&from&to` (`AuditLogService.ts`)

**API has**: `GET /audit/activity`, `GET /audit/login-logs`

**Fix options**:

| Option | Work |
|--------|------|
| A | Add alias router `@router.get("/admin/audit")` → delegate to activity service |
| B | Change UI service to `/audit/activity` |
| C | Implement full admin audit with entity filters per spec 12 |

Recommend **A + C**: alias for quick fix; extend query params to match UI filters.

---

## Required APIs — operations hub

| Endpoint group | Status | Notes |
|----------------|--------|-------|
| `/admin/dashboard/summary` | ⚠️ needs migration | |
| `/admin/operations/overview` | ⚠️ needs migration | |
| `/admin/enquiries/*` | ⚠️ needs migration | CRM columns |
| `/admin/orders/*` | ✅ | Core liver-care |
| `/admin/pathology/*` | ✅ | |
| `/admin/packages/*` | ✅ | |
| `/admin/sample-collections/analytics` | ✅ | |
| `/admin/staff/*` | ⚠️ archive cols | migration 036 |
| `/admin/appointments/*` | ❌ missing | See F05 |

---

## Edge cases

| # | Scenario | Expected |
|---|----------|----------|
| E1 | Empty enquiries list | 200, empty array |
| E2 | Enquiry convert to order | Creates service_order + patient link |
| E3 | Order transition invalid state | 422 with clear message |
| E4 | Ops without city in URL | Legacy redirect works |
| E5 | Audit filter by order_id | Returns filtered activity rows |
| E6 | Roster with no lab partners | 200, [] |

---

## Admin notification log (G-14)

**Current**: `AdminLiverCareNotificationsPage` uses dummy in-memory log.

**Target**:

1. Persist sends to `integrations.notifications_log` (table exists, unused)
2. Add `GET /admin/notifications/log` with pagination
3. Or derive from `audit.notification_outbox` processed rows

**Edge cases**: filter by order_id, channel, failed status.

---

## Tests

- Contract: dashboard summary, enquiries list, roster path
- E2E: Super Admin → ops hub → all tabs load without 500
- Integration: enquiry → order convert flow
